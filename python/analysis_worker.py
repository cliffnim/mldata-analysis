import json
import re
import sys
from typing import Any

import numpy as np
import pandas as pd

MAX_ROWS = 50_000
MAX_COLUMNS = 100
MAX_TRAIN_ROWS = 10_000


def json_safe(value: Any) -> Any:
    if isinstance(value, dict):
        return {str(key): json_safe(item) for key, item in value.items()}
    if isinstance(value, (list, tuple)):
        return [json_safe(item) for item in value]
    if isinstance(value, (np.integer, np.floating, np.bool_)):
        value = value.item()
    if pd.isna(value):
        return None
    if isinstance(value, (str, int, float, bool)) or value is None:
        return value
    return str(value)


def build_frame(request: dict[str, Any]) -> tuple[pd.DataFrame, dict[str, dict[str, Any]]]:
    rows = request.get("rows")
    columns = request.get("columns")
    if not isinstance(rows, list) or not rows:
        raise ValueError("Upload or extract at least one row before running Python analysis.")
    if len(rows) > MAX_ROWS:
        raise ValueError(f"Python analysis is limited to {MAX_ROWS:,} rows per request.")
    if not isinstance(columns, list) or not columns or len(columns) > MAX_COLUMNS:
        raise ValueError(f"Provide between 1 and {MAX_COLUMNS} dataset columns.")

    definitions: dict[str, dict[str, Any]] = {}
    for column in columns:
        if not isinstance(column, dict) or not isinstance(column.get("key"), str):
            raise ValueError("Each column needs a string key.")
        definitions[column["key"]] = column
    if not definitions:
        raise ValueError("No usable columns were provided.")

    valid_rows = [row for row in rows if isinstance(row, dict)]
    if not valid_rows:
        raise ValueError("No valid tabular rows were provided.")
    frame = pd.DataFrame.from_records(valid_rows).reindex(columns=definitions.keys())
    frame = frame.replace(r"^\s*$", np.nan, regex=True)

    for key, definition in definitions.items():
        if definition.get("type") in {"number", "currency"}:
            values = frame[key].astype("string").str.replace(r"[^0-9.eE+-]", "", regex=True)
            frame[key] = pd.to_numeric(values, errors="coerce")

    return frame, definitions


def profile_dataset(frame: pd.DataFrame, definitions: dict[str, dict[str, Any]]) -> dict[str, Any]:
    numeric_columns = [key for key in frame if pd.api.types.is_numeric_dtype(frame[key])]
    categorical_columns = [key for key in frame if key not in numeric_columns]
    missing = frame.isna().sum()
    column_profiles = []

    for key in frame.columns:
        series = frame[key]
        profile: dict[str, Any] = {
            "key": key,
            "label": definitions[key].get("label") or key,
            "type": definitions[key].get("type", "string"),
            "missing": int(missing[key]),
            "unique": int(series.nunique(dropna=True)),
        }
        if key in numeric_columns and series.notna().any():
            profile["statistics"] = {
                "mean": float(series.mean()),
                "median": float(series.median()),
                "min": float(series.min()),
                "max": float(series.max()),
                "standardDeviation": float(series.std()) if series.count() > 1 else 0.0,
            }
        else:
            profile["topValues"] = [
                {"value": str(value), "count": int(count)}
                for value, count in series.value_counts(dropna=True).head(5).items()
            ]
        column_profiles.append(profile)

    correlations = []
    if len(numeric_columns) > 1:
        matrix = frame[numeric_columns].corr(min_periods=2)
        for left_index, left in enumerate(numeric_columns):
            for right in numeric_columns[left_index + 1:]:
                value = matrix.loc[left, right]
                if pd.notna(value):
                    correlations.append({"left": left, "right": right, "correlation": float(value)})
    correlations.sort(key=lambda pair: abs(pair["correlation"]), reverse=True)

    return {
        "rowCount": int(len(frame)),
        "columnCount": int(len(frame.columns)),
        "duplicateRows": int(frame.duplicated().sum()),
        "missingCells": int(missing.sum()),
        "numericColumns": numeric_columns,
        "categoricalColumns": categorical_columns,
        "columns": column_profiles,
        "correlations": correlations[:20],
    }


def select_column(keys: list[str], definitions: dict[str, dict[str, Any]], preferred_types: set[str]) -> str | None:
    return next((key for key in keys if definitions[key].get("type") in preferred_types), None)


def select_mentioned_column(keys: list[str], definitions: dict[str, dict[str, Any]], query: str) -> str | None:
    for key in keys:
        label = str(definitions[key].get("label") or key).lower()
        normalized_key = key.replace("_", " ").lower()
        if re.search(rf"(?<!\w){re.escape(label)}(?!\w)", query) or re.search(rf"(?<!\w){re.escape(normalized_key)}(?!\w)", query):
            return key
    return None


def run_instruction(
    instruction: str,
    frame: pd.DataFrame,
    definitions: dict[str, dict[str, Any]],
) -> dict[str, Any]:
    query = instruction.strip().lower()
    if not query:
        raise ValueError("Enter an analysis instruction.")

    numeric_keys = [key for key in frame if pd.api.types.is_numeric_dtype(frame[key])]
    categorical_keys = [key for key in frame if key not in numeric_keys]

    if any(word in query for word in ("missing", "null", "blank", "empty")):
        missing = frame.isna().sum()
        items = [
            {"column": definitions[key].get("label") or key, "missing": int(count)}
            for key, count in missing.items()
        ]
        return {"title": "Missing-value analysis", "summary": f"Found {int(missing.sum())} missing cells across {len(frame)} rows.", "items": items}

    if any(word in query for word in ("duplicate", "duplicates", "repeated rows")):
        count = int(frame.duplicated().sum())
        return {"title": "Duplicate-row analysis", "summary": f"Found {count} exact duplicate rows in {len(frame)} records.", "items": [{"duplicateRows": count, "uniqueRows": int(len(frame) - count)}]}

    if any(word in query for word in ("outlier", "outliers", "anomal", "anomaly", "extreme")):
        items = []
        for key in numeric_keys:
            values = frame[key].dropna()
            if values.empty:
                continue
            q1, q3 = values.quantile([0.25, 0.75])
            spread = q3 - q1
            outliers = values[(values < q1 - 1.5 * spread) | (values > q3 + 1.5 * spread)]
            items.append({"column": definitions[key].get("label") or key, "outlierCount": int(len(outliers)), "examples": [float(value) for value in outliers.head(5)]})
        return {"title": "Numeric outlier analysis", "summary": f"Checked {len(numeric_keys)} numeric columns using the 1.5×IQR rule.", "items": items}

    if any(word in query for word in ("correlat", "relationship", "related")):
        result = profile_dataset(frame, definitions)
        return {"title": "Correlation analysis", "summary": f"Calculated pairwise correlations across {len(numeric_keys)} numeric columns.", "items": result["correlations"]}

    if any(word in query for word in ("group", "compare", "breakdown", "by category", "by region")):
        group_key = select_mentioned_column(categorical_keys, definitions, query) or select_column(categorical_keys, definitions, {"string", "tag", "boolean"})
        value_key = select_mentioned_column(numeric_keys, definitions, query) or (numeric_keys[0] if numeric_keys else None)
        if not group_key or not value_key:
            raise ValueError("Group comparisons need at least one categorical and one numeric column.")
        grouped = frame.groupby(group_key, dropna=False)[value_key].agg(["count", "sum", "mean"]).reset_index()
        items = grouped.sort_values("sum", ascending=False).head(30).rename(columns={group_key: definitions[group_key].get("label") or group_key, "mean": "average"}).to_dict("records")
        return {"title": f"{definitions[value_key].get('label') or value_key} by {definitions[group_key].get('label') or group_key}", "summary": f"Compared {value_key} across {len(grouped)} groups in {group_key}.", "items": json_safe(items)}

    if any(word in query for word in ("summar", "profile", "describe", "overview")):
        profile = profile_dataset(frame, definitions)
        return {"title": "Dataset summary", "summary": f"Profiled {profile['rowCount']} rows and {profile['columnCount']} columns; found {profile['missingCells']} missing cells and {profile['duplicateRows']} duplicate rows.", "items": profile["columns"], "correlations": profile["correlations"]}

    raise ValueError("Supported instructions: summarize/profile, missing values, duplicates, outliers/anomalies, correlations, and categorical group comparisons.")


def train_predictive_model(
    frame: pd.DataFrame,
    definitions: dict[str, dict[str, Any]],
    target: str,
) -> dict[str, Any]:
    from sklearn.compose import ColumnTransformer
    from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
    from sklearn.impute import SimpleImputer
    from sklearn.metrics import accuracy_score, f1_score, mean_absolute_error, r2_score
    from sklearn.model_selection import train_test_split
    from sklearn.pipeline import Pipeline
    from sklearn.preprocessing import OneHotEncoder

    if target not in frame.columns:
        raise ValueError("Choose a target column from the current dataset.")

    usable = frame.dropna(subset=[target]).copy()
    if len(usable) < 20:
        raise ValueError("Training needs at least 20 rows with a non-missing target value.")
    totalUsableRows = len(usable)
    wasSampled = totalUsableRows > MAX_TRAIN_ROWS
    if wasSampled:
        usable = usable.sample(n=MAX_TRAIN_ROWS, random_state=42)
    feature_columns = [key for key in usable.columns if key != target and usable[key].notna().any()]
    if not feature_columns:
        raise ValueError("The selected target needs at least one non-empty feature column.")

    y = usable[target]
    declared_type = definitions[target].get("type", "string")
    is_classification = declared_type in {"string", "tag", "boolean"} or y.nunique() <= 10
    if is_classification and y.nunique() < 2:
        raise ValueError("Classification needs at least two distinct target classes.")
    if not is_classification and y.nunique() < 2:
        raise ValueError("Regression needs at least two distinct target values.")

    features = usable[feature_columns]
    numeric_features = [key for key in feature_columns if pd.api.types.is_numeric_dtype(features[key])]
    categorical_features = [key for key in feature_columns if key not in numeric_features]
    transformers = []
    if numeric_features:
        transformers.append(("numeric", SimpleImputer(strategy="median"), numeric_features))
    if categorical_features:
        transformers.append((
            "categorical",
            Pipeline([
                ("imputer", SimpleImputer(strategy="most_frequent")),
                ("onehot", OneHotEncoder(handle_unknown="ignore", min_frequency=2, max_categories=100)),
            ]),
            categorical_features,
        ))
    preprocessor = ColumnTransformer(transformers)
    estimator_options = {"n_estimators": 80, "max_depth": 12, "min_samples_leaf": 2, "random_state": 42, "n_jobs": 1}
    estimator = RandomForestClassifier(**estimator_options) if is_classification else RandomForestRegressor(**estimator_options)
    model = Pipeline([("preprocess", preprocessor), ("model", estimator)])

    stratify = y if is_classification and y.value_counts().min() >= 2 and y.nunique() <= 10 else None
    try:
        x_train, x_test, y_train, y_test = train_test_split(
            features,
            y,
            test_size=0.25,
            random_state=42,
            stratify=stratify,
        )
        model.fit(x_train, y_train)
        predictions = model.predict(x_test)
    except ValueError as error:
        raise ValueError(f"Could not train on this split: {error}") from error

    if is_classification:
        metrics = {
            "accuracy": float(accuracy_score(y_test, predictions)),
            "weightedF1": float(f1_score(y_test, predictions, average="weighted", zero_division=0)),
            "testRows": int(len(y_test)),
        }
        task = "classification"
    else:
        metrics = {
            "meanAbsoluteError": float(mean_absolute_error(y_test, predictions)),
            "r2": float(r2_score(y_test, predictions)) if len(y_test) >= 2 else None,
            "testRows": int(len(y_test)),
        }
        task = "regression"

    trained_model = model.named_steps["model"]
    transformed_names = model.named_steps["preprocess"].get_feature_names_out()
    importance = [
        {"feature": str(name), "importance": float(score)}
        for name, score in zip(transformed_names, trained_model.feature_importances_)
    ]
    importance.sort(key=lambda item: item["importance"], reverse=True)
    sample_predictions = [
        {"actual": json_safe(actual), "predicted": json_safe(predicted)}
        for actual, predicted in zip(y_test.iloc[:10], predictions[:10])
    ]

    return {
        "title": f"Random Forest {task} model",
        "target": target,
        "task": task,
        "trainingRows": int(len(x_train)),
        "testRows": int(len(x_test)),
        "rowsUsed": int(len(usable)),
        "sampled": wasSampled,
        "features": feature_columns,
        "metrics": json_safe(metrics),
        "featureImportance": importance[:15],
        "samplePredictions": sample_predictions,
        "note": f"Evaluation uses a held-out 25% test split. {f'A deterministic {MAX_TRAIN_ROWS:,}-row sample was used. ' if wasSampled else ''}Feature importance is descriptive, not causal.",
    }


def analyze_dataset(request: dict[str, Any]) -> dict[str, Any]:
    frame, definitions = build_frame(request)
    mode = request.get("mode", "profile")

    if mode == "profile":
        return {"mode": mode, "title": "Python dataset profile", **json_safe(profile_dataset(frame, definitions))}
    if mode == "instruction":
        result = run_instruction(str(request.get("instruction", "")), frame, definitions)
        return {"mode": mode, **json_safe(result)}
    if mode == "train":
        result = train_predictive_model(frame, definitions, str(request.get("target", "")))
        return {"mode": mode, **json_safe(result)}
    raise ValueError("Choose profile, instruction, or train mode.")


def main() -> int:
    try:
        request = json.load(sys.stdin)
        if not isinstance(request, dict):
            raise ValueError("The Python analysis request must be a JSON object.")
        result = analyze_dataset(request)
        print(json.dumps(result, ensure_ascii=True, allow_nan=False))
        return 0
    except ValueError as error:
        print(json.dumps({"error": str(error)}, ensure_ascii=True))
        return 2
    except Exception:
        print(json.dumps({"error": "Python analysis failed. Check the dataset values and installed Python dependencies."}, ensure_ascii=True))
        return 1


if __name__ == "__main__":
    raise SystemExit(main())