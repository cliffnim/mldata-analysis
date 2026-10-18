import unittest

import pandas as pd

from analysis_worker import analyze_dataset, build_frame, run_instruction


class PythonAnalysisWorkerTests(unittest.TestCase):
    def setUp(self):
        self.columns = [
            {"key": "region", "label": "Region", "type": "string"},
            {"key": "units", "label": "Units", "type": "number"},
            {"key": "revenue", "label": "Revenue", "type": "currency"},
        ]
        self.rows = [
            {"region": "North", "units": index + 1, "revenue": f"${(index + 1) * 10:,}"}
            for index in range(40)
        ]

    def test_profile_reports_dimensions_missing_values_and_numeric_statistics(self):
        rows = self.rows + [{"region": "North", "units": None, "revenue": None}]
        result = analyze_dataset({"mode": "profile", "columns": self.columns, "rows": rows})

        self.assertEqual(result["rowCount"], 41)
        self.assertEqual(result["columnCount"], 3)
        self.assertEqual(result["missingCells"], 2)
        self.assertEqual(result["duplicateRows"], 0)
        self.assertEqual(result["columns"][1]["statistics"]["mean"], 20.5)

    def test_instruction_runs_group_comparison_without_executing_user_code(self):
        columns = self.columns + [{"key": "segment", "label": "Segment", "type": "tag"}]
        rows = [{**row, "segment": "A" if index % 2 else "B"} for index, row in enumerate(self.rows)]
        result = analyze_dataset({"mode": "instruction", "columns": columns, "rows": rows, "instruction": "Compare revenue by segment"})

        self.assertEqual(result["mode"], "instruction")
        self.assertEqual(len(result["items"]), 2)
        self.assertIn("average", result["items"][0])

    def test_instruction_rejects_unsupported_requests(self):
        frame, definitions = build_frame({"columns": self.columns, "rows": self.rows})

        with self.assertRaisesRegex(ValueError, "Supported instructions"):
            run_instruction("write arbitrary Python code", frame, definitions)

    def test_classifier_trains_on_a_holdout_and_reports_feature_importance(self):
        columns = self.columns + [{"key": "purchased", "label": "Purchased", "type": "boolean"}]
        rows = [{**row, "purchased": index % 2 == 0} for index, row in enumerate(self.rows)]
        result = analyze_dataset({"mode": "train", "columns": columns, "rows": rows, "target": "purchased"})

        self.assertEqual(result["task"], "classification")
        self.assertEqual(result["testRows"], 10)
        self.assertIn("accuracy", result["metrics"])
        self.assertTrue(result["featureImportance"])

    def test_regressor_trains_for_a_continuous_numeric_target(self):
        result = analyze_dataset({"mode": "train", "columns": self.columns, "rows": self.rows, "target": "revenue"})

        self.assertEqual(result["task"], "regression")
        self.assertEqual(result["testRows"], 10)
        self.assertIn("meanAbsoluteError", result["metrics"])

    def test_model_rejects_datasets_too_small_for_a_holdout(self):
        with self.assertRaisesRegex(ValueError, "at least 20 rows"):
            analyze_dataset({"mode": "train", "columns": self.columns, "rows": self.rows[:10], "target": "revenue"})

    def test_analysis_enforces_row_limit(self):
        with self.assertRaisesRegex(ValueError, "limited to 50,000 rows"):
            build_frame({"columns": self.columns, "rows": self.rows * 1251})


if __name__ == "__main__":
    unittest.main()