import { ExtractionPreset } from '../types';

export const SAMPLE_FOLDERS: ExtractionPreset[] = [
  {
    id: 'invoices-folder',
    name: 'Enterprise Invoices & Receipts (2025)',
    description: 'Vendor bills, cloud subscriptions, consulting retainers, and expense receipts across quarters.',
    icon: 'Receipt',
    category: 'Financial & Accounting',
    defaultSchema: {
      category: 'Invoices & Receipts',
      spreadsheetTitle: 'Q1-Q2 Vendor Disbursements & Expenses',
      domainSummary: 'Multi-vendor corporate invoices, line-item expenses, tax rates, and payment due dates.',
      columns: [
        { key: 'invoiceNumber', label: 'Invoice #', type: 'string', description: 'Unique document or invoice identifier' },
        { key: 'vendorName', label: 'Vendor / Provider', type: 'string', description: 'Company or person issuing the invoice' },
        { key: 'invoiceDate', label: 'Date', type: 'date', description: 'Issue date in YYYY-MM-DD' },
        { key: 'dueDate', label: 'Due Date', type: 'date', description: 'Payment due date' },
        { key: 'subtotal', label: 'Subtotal ($)', type: 'currency', description: 'Subtotal amount before taxes' },
        { key: 'taxAmount', label: 'Tax ($)', type: 'currency', description: 'Sales tax or VAT' },
        { key: 'totalAmount', label: 'Total Amount ($)', type: 'currency', description: 'Final payable amount' },
        { key: 'paymentTerms', label: 'Payment Terms', type: 'tag', description: 'e.g. Net 30, Due Upon Receipt, Paid Card' },
        { key: 'category', label: 'Expense Category', type: 'tag', description: 'Cloud Infrastructure, Hardware, SaaS, Consulting, Travel' },
      ],
      extractionInstructions: 'Extract monetary values as clean numbers. Ensure vendor names are standardized. Note if payment status is marked paid.',
    },
    files: [
      {
        name: 'INV-9921_AWS_Cloud.txt',
        relativePath: 'Finance/2025/Q1/INV-9921_AWS_Cloud.txt',
        mimeType: 'text/plain',
        content: `AMAZON WEB SERVICES EMEA SARL
38 AVENUE JOHN F. KENNEDY, L-1855 LUXEMBOURG
Tax ID: LU201844621

TAX INVOICE / STATEMENT
Invoice Number: AWS-INV-2025-9921
Invoice Date: 2025-01-31
Due Date: 2025-02-15
Customer: Horizon AI Systems Inc.
Account ID: 819-204-1102

Summary of Charges:
- EC2 Compute Fleet (us-east-1 & eu-west-1): $3,840.50
- S3 Cloud Object Storage (14.2 TB): $340.80
- Amazon Bedrock & ML Model API Usage: $1,250.00
- Data Transfer & NAT Gateway: $184.20

Subtotal: $5,615.50
Tax / VAT (0% Reverse Charge B2B): $0.00
Total Payable Amount: $5,615.50 USD
Payment Terms: Automatic Credit Card Charge on File (Paid)`,
      },
      {
        name: 'Slack_Subscription_INV-5820.txt',
        relativePath: 'Finance/2025/Q1/Slack_Subscription_INV-5820.txt',
        mimeType: 'text/plain',
        content: `Slack Technologies, LLC
A Salesforce Company
500 Howard Street, San Francisco, CA 94105
support@slack.com

INVOICE
Invoice #: SLACK-SUB-5820
Date Issued: 2025-02-01
Payment Due: 2025-03-03 (Net 30)
Bill To: Horizon AI Systems Inc.
Attn: Accounts Payable

Plan: Slack Business+ Annual Subscription
Seats: 45 Active Users @ $15.00/user/month (Billed Annually)
Duration: Feb 01, 2025 - Jan 31, 2026

Subtotal: $8,100.00
State & City Tax (8.5%): $688.50
Total Billed Amount: $8,788.50 USD
Status: Awaiting Wire Transfer`,
      },
      {
        name: 'Dell_Precision_Workstations_HW-88310.txt',
        relativePath: 'Finance/2025/Q2/Hardware/Dell_Precision_Workstations_HW-88310.txt',
        mimeType: 'text/plain',
        content: `DELL DIRECT COMMERCIAL SALES
One Dell Way, Round Rock, TX 78682
Order # DELL-948192
Invoice Number: HW-88310
Invoice Date: 2025-04-12
Payment Terms: Net 45
Due Date: 2025-05-27

Deliver To:
Horizon AI Systems - Engineering Lab
Bldg 4, Suite 200, Austin, TX

Items:
Qty 2 x Dell Precision 7960 Workstation (Dual Intel Xeon, 128GB DDR5, RTX 5000 Ada 32GB)
Unit Price: $6,450.00 | Total: $12,900.00
Qty 4 x Dell UltraSharp 32" 4K USB-C Hub Monitor (U3223QE)
Unit Price: $720.00 | Total: $2,880.00

Subtotal: $15,780.00
Freight / Expedited Courier: $250.00
Texas State Sales Tax (6.25%): $986.25
Total Balance Due: $17,016.25 USD`,
      },
      {
        name: 'Acme_Advisors_Legal_Consulting_CON-1092.txt',
        relativePath: 'Finance/2025/Q2/Consulting/Acme_Advisors_Legal_Consulting_CON-1092.txt',
        mimeType: 'text/plain',
        content: `ACME LEGAL & STRATEGIC ADVISORY LLP
100 Wall Street, 24th Floor, New York, NY 10005

STATEMENT OF PROFESSIONAL SERVICES
Invoice ID: CON-1092
Billing Period: March 1 - March 31, 2025
Invoice Date: 2025-04-05
Terms: Net 15
Due Date: 2025-04-20

Client: Horizon AI Systems Inc.

Matter: Intellectual Property, Patent Portfolio & Series B Preparation
- Senior Partner (E. Vance, Esq.) 8.5 hrs @ $850/hr = $7,225.00
- Senior Associate (M. Sterling) 14.0 hrs @ $520/hr = $7,280.00
- USPTO Regulatory Filing Disbursements: $1,450.00

Subtotal Services: $14,505.00
Disbursements & Filing Fees: $1,450.00
Applicable Tax: $0.00 (Exempt Legal Consulting)
Total Remittance: $15,955.00 USD`,
      },
      {
        name: 'FedEx_Global_Logistics_INV-4011.txt',
        relativePath: 'Finance/2025/Q1/FedEx_Global_Logistics_INV-4011.txt',
        mimeType: 'text/plain',
        content: `FedEx Corporate Services
P.O. Box 7221, Pasadena, CA 91109-7321

FREIGHT & COURIER INVOICE
Invoice Number: FDX-4011-92
Date of Invoice: 2025-02-18
Payment Due: Due Upon Receipt (2025-02-18)
Account Number: 284-9182-1

Tracking # 781920481023
Origin: Shenzhen, China -> Destination: Austin, TX
Service: International Priority Air Freight (Custom Hardware Samples, 18.4 kg)
Base Rate: $485.00
Fuel Surcharge (14.2%): $68.87
Customs Clearance & Duties: $112.50

Subtotal: $666.37
Taxes: $0.00
Total Amount Charged: $666.37 USD
Status: Paid by Corporate Amex (Auth # 941029)`,
      },
      {
        name: 'BlueBottle_Executive_Dinner_Receipt.txt',
        relativePath: 'Finance/Receipts_Expenses/BlueBottle_Executive_Dinner_Receipt.txt',
        mimeType: 'text/plain',
        content: `BLUE BOTTLE & PROVISIONS
San Francisco Ferry Building, SF, CA
Receipt / Sales Slip: BB-89210
Date: 2025-03-14 19:42 PST

Employee: Jessica Thorne (VP Engineering)
Purpose: Candidate recruitment dinner & technical review

1 x Artisanal Tasting Menu (3 Guests) - $285.00
2 x Sonoma Reserve Pinot Noir - $140.00
3 x Single Origin Espresso Drinks - $22.50

Subtotal: $447.50
SF Health Mandate (4%): $17.90
California Sales Tax (8.625%): $38.60
Gratuity (20%): $89.50
Total Charged: $593.50 USD
Payment Method: Visa Ending in 4419 (Jessica Thorne)`,
      },
    ],
  },
  {
    id: 'resumes-folder',
    name: 'HR Candidate Portfolios & Resumes',
    description: 'Engineering, product, ML, and UX candidate CVs with skills, years of experience, and target roles.',
    icon: 'Briefcase',
    category: 'Human Resources & Talent',
    defaultSchema: {
      category: 'Candidate Profiles',
      spreadsheetTitle: '2025 Tech Hiring Pipeline Candidates',
      domainSummary: 'Applicant resumes, experience levels, educational pedigree, core skills, and contact info.',
      columns: [
        { key: 'candidateName', label: 'Candidate Name', type: 'string', description: 'Full name of applicant' },
        { key: 'targetRole', label: 'Applied Role', type: 'string', description: 'Role or specialization' },
        { key: 'yearsExperience', label: 'Years of Exp', type: 'number', description: 'Total professional years' },
        { key: 'currentCompany', label: 'Current / Last Company', type: 'string', description: 'Most recent employer' },
        { key: 'highestDegree', label: 'Education Degree', type: 'string', description: 'Highest attained degree and university' },
        { key: 'primarySkills', label: 'Key Tech Stack', type: 'string', description: 'Top languages and frameworks' },
        { key: 'location', label: 'Location', type: 'string', description: 'City, State or Country' },
        { key: 'seniorityLevel', label: 'Seniority Level', type: 'tag', description: 'Junior, Mid, Senior, Lead, Director' },
        { key: 'email', label: 'Email Address', type: 'string', description: 'Contact email' },
      ],
      extractionInstructions: 'Extract years of experience as an integer. Summarize key technical skills into comma separated highlights.',
    },
    files: [
      {
        name: 'Alex_Chen_Senior_Fullstack.txt',
        relativePath: 'Talent/Engineering/Alex_Chen_Senior_Fullstack.txt',
        mimeType: 'text/plain',
        content: `ALEXANDER CHEN
Seattle, WA | alex.chen.dev@gmail.com | (206) 555-0192 | github.com/alexchen-dev

OBJECTIVE: Senior Fullstack Software Engineer

PROFESSIONAL EXPERIENCE:
Stripe, Senior Software Engineer (2021 - Present, 4 years)
- Architected merchant onboarding pipelines serving 40,000+ daily transactions using React, TypeScript, and Go microservices.
- Reduced API p99 latency by 38% by implementing Redis multi-tiered caching and gRPC streaming.

Uber Technologies, Software Engineer (2018 - 2021, 3 years)
- Developed driver dispatch web dashboards using React, Redux, Node.js, and Kafka event streaming.
Total Professional Experience: 7 Years

EDUCATION:
B.S. in Computer Science, University of Washington (Magna Cum Laude, 2018)

TECHNICAL SKILLS:
Languages: TypeScript, JavaScript, Go, Python, SQL
Frameworks: React 19, Next.js, Node.js, Tailwind CSS, Express
Cloud & Infra: AWS (ECS, Lambda, RDS), Docker, Kubernetes, Terraform, Postgres`,
      },
      {
        name: 'Elena_Rostova_Machine_Learning.txt',
        relativePath: 'Talent/Data_Science/Elena_Rostova_Machine_Learning.txt',
        mimeType: 'text/plain',
        content: `DR. ELENA ROSTOVA
San Francisco, CA | elena.rostova.ai@stanfordalumni.org | (415) 555-8832

TARGET POSITION: Staff Machine Learning Engineer / AI Researcher

SUMMARY:
Machine Learning scientist with 8+ years of industry experience focusing on Large Language Models, Multimodal Transformers, and high-throughput vector retrieval architectures.

EXPERIENCE:
Anthropic / Alignment Research Lab, Staff ML Engineer (2022 - Present, 3 years)
- Led pre-training data curation pipelines processing 2.5 trillion tokens using PyTorch and JAX on TPU v4 clusters.
- Developed reinforcement learning from human feedback (RLHF) evaluation frameworks.

Google Research, Senior Research Scientist (2017 - 2022, 5 years)
- Contributed to early Transformer attention optimizations and multimodal embedding alignments. Co-authored 4 NeurIPS/ICLR papers.
Total Professional Experience: 8 Years

EDUCATION:
Ph.D. in Artificial Intelligence, Stanford University (2017)
M.S. in Computer Science, Carnegie Mellon University (2013)

CORE EXPERTISE:
PyTorch, JAX, Hugging Face, CUDA, Triton, Ray, Vector DBs (Pinecone, Qdrant), Python, C++`,
      },
      {
        name: 'Marcus_Vance_Product_Manager.txt',
        relativePath: 'Talent/Product/Marcus_Vance_Product_Manager.txt',
        mimeType: 'text/plain',
        content: `MARCUS VANCE
New York, NY | marcus.vance@vancemail.net | (917) 555-4301

ROLE SOUGHT: Director of Product Management / Lead PM

CAREER OVERVIEW:
10 years driving B2B enterprise SaaS product strategy, zero-to-one product launches, and monetization roadmaps.

EXPERIENCE:
Datadog, Group Product Manager - Cloud Security (2021 - Present, 4 years)
- Managed a product group of 4 PMs and 32 engineers. Grew Cloud SIEM product line ARR from $18M to $65M in 24 months.
- Championed AI-driven automated incident triaging features.

MongoDB, Senior Product Manager (2017 - 2021, 4 years)
- Owned Atlas database search and developer productivity tooling.

Atlassian, Product Manager (2015 - 2017, 2 years)
Total Experience: 10 Years

EDUCATION:
M.B.A., Harvard Business School (2015)
B.S. in Electrical Engineering & CS, MIT (2011)

SKILLS:
Product Roadmap, OKRs, Enterprise Pricing, User Research, SQL, Amplitude, Figma, Agile`,
      },
      {
        name: 'Liam_OConnor_Lead_Product_Designer.txt',
        relativePath: 'Talent/Design/Liam_OConnor_Lead_Product_Designer.txt',
        mimeType: 'text/plain',
        content: `LIAM O'CONNOR
Austin, TX (Open to Remote) | liam@designstudio.io | (512) 555-7741

APPLICATION: Lead Product & Design Systems Architect

PROFILE:
Product designer with 6 years experience crafting design systems, complex data visualization dashboards, and mobile applications.

EXPERIENCE:
Linear, Senior Product Designer (2022 - Present, 3 years)
- Redesigned project insights graphs and real-time keyboard navigation workflows.
- Maintained unified multi-platform component library with dark mode tokens.

Figma Community Advocate & Designer, Automattic (2019 - 2022, 3 years)
- Built open-source design systems adopted by 120,000+ designers globally.
Total Experience: 6 Years

EDUCATION:
B.F.A. in Interaction Design, Rhode Island School of Design (RISD, 2019)

SKILLS:
Figma, Design Systems, Typography, Motion UI, Framer, User Testing, HTML/CSS, React prototyping`,
      },
      {
        name: 'Sarah_Connor_DevOps_Architect.txt',
        relativePath: 'Talent/Engineering/Sarah_Connor_DevOps_Architect.txt',
        mimeType: 'text/plain',
        content: `SARAH CONNOR
Denver, CO | s.connor@skylineops.cloud | (303) 555-9014

APPLICATION: Principal Cloud Platform & Site Reliability Engineer

SUMMARY:
9 years of high-scale cloud infrastructure, zero-downtime Kubernetes deployments, and security compliance (SOC2 Type II, FedRAMP).

EXPERIENCE:
Snowflake, Principal Infrastructure Engineer (2020 - Present, 5 years)
- Managed multi-cloud global Kubernetes fleets handling petabyte-scale streaming pipelines.
- Cut annual AWS/Azure egress spend by $1.8M through intelligent pod topology routing.

Twilio, Senior DevOps Engineer (2016 - 2020, 4 years)
- Built automated CI/CD canary deployment pipelines using ArgoCD and Spinnaker.
Total Experience: 9 Years

EDUCATION:
B.S. in Computer Systems Engineering, Colorado School of Mines (2016)

SKILLS:
Kubernetes (CKA), Terraform, ArgoCD, Helm, AWS, GCP, Prometheus, Grafana, Go, Bash, Python`,
      },
    ],
  },
  {
    id: 'clinical-folder',
    name: 'Clinical Lab Panels & Patient Reports',
    description: 'Biochemical panels, bloodwork diagnostics, metabolic metrics, and reference values.',
    icon: 'Activity',
    category: 'Healthcare & Clinical Diagnostics',
    defaultSchema: {
      category: 'Medical Lab Reports',
      spreadsheetTitle: 'Clinical Diagnostic Blood & Metabolic Panels',
      domainSummary: 'Patient diagnostic reports, test panel types, key biomarker measurements, and abnormal flags.',
      columns: [
        { key: 'patientId', label: 'Patient ID', type: 'string', description: 'Anonymized patient or record ID' },
        { key: 'testDate', label: 'Test Date', type: 'date', description: 'Specimen collection date' },
        { key: 'panelName', label: 'Test Panel Name', type: 'string', description: 'e.g. Comprehensive Metabolic, CBC, Lipid' },
        { key: 'orderingPhysician', label: 'Physician', type: 'string', description: 'Doctor requesting test' },
        { key: 'primaryBiomarker', label: 'Key Biomarker', type: 'string', description: 'Primary analyte measured' },
        { key: 'resultValue', label: 'Result Value', type: 'number', description: 'Numeric measurement' },
        { key: 'referenceRange', label: 'Normal Reference Range', type: 'string', description: 'e.g. 70-99 mg/dL' },
        { key: 'flagStatus', label: 'Clinical Flag', type: 'tag', description: 'NORMAL, HIGH, LOW, CRITICAL' },
        { key: 'fastingStatus', label: 'Fasting?', type: 'boolean', description: 'Was patient fasting' },
      ],
      extractionInstructions: 'Extract numeric values accurately. If marked above or below reference range, set Clinical Flag to HIGH or LOW.',
    },
    files: [
      {
        name: 'Patient_7041_Comprehensive_Metabolic.txt',
        relativePath: 'Clinical_Data/Blood_Panels/Patient_7041_Comprehensive_Metabolic.txt',
        mimeType: 'text/plain',
        content: `QUEST DIAGNOSTICS CLINICAL REPORT
Specimen ID: SP-99104-CMP
Patient ID: PT-7041 (Age: 48, Male)
Collection Date: 2025-02-14 07:30 AM
Fasting: Yes (12 Hours Overnight Fast)
Ordering Physician: Dr. Aris Thorne, MD (Internal Medicine)

COMPREHENSIVE METABOLIC PANEL (CMP-14):
- Fasting Serum Glucose: 118 mg/dL  [HIGH]  (Normal Reference: 70 - 99 mg/dL)
- Blood Urea Nitrogen (BUN): 16 mg/dL  [NORMAL]  (Normal: 7 - 20 mg/dL)
- Serum Creatinine: 0.95 mg/dL  [NORMAL]  (Normal: 0.70 - 1.30 mg/dL)
- eGFR: >90 mL/min/1.73m2  [NORMAL]
- Sodium: 140 mmol/L  [NORMAL]  (Normal: 135 - 145 mmol/L)
- Potassium: 4.2 mmol/L  [NORMAL]  (Normal: 3.5 - 5.0 mmol/L)
- ALT (SGPT): 24 U/L  [NORMAL]

Clinical Impression: Elevated fasting blood glucose consistent with pre-diabetic baseline. Other metabolic parameters unremarkable.`,
      },
      {
        name: 'Patient_8192_Lipid_Cardiovascular.txt',
        relativePath: 'Clinical_Data/Blood_Panels/Patient_8192_Lipid_Cardiovascular.txt',
        mimeType: 'text/plain',
        content: `LABCORP CLINICAL PATHOLOGY
Specimen ID: LC-2840-LIPID
Patient ID: PT-8192 (Age: 56, Female)
Collection Date: 2025-03-01 08:15 AM
Fasting: Yes
Ordering Physician: Dr. Michael Chang, MD (Cardiology)

LIPID PANEL WITH DIRECT LDL:
- Total Cholesterol: 245 mg/dL  [HIGH]  (Desirable: <200 mg/dL)
- Triglycerides: 190 mg/dL  [HIGH]  (Normal: <150 mg/dL)
- HDL Cholesterol: 42 mg/dL  [LOW]  (Optimal: >50 mg/dL for females)
- LDL Cholesterol (Calculated): 165 mg/dL  [HIGH]  (Optimal: <100 mg/dL)

Physician Note: Atherogenic dyslipidemia profile. Recommend initiating moderate-intensity statin therapy and Mediterranean dietary protocol.`,
      },
      {
        name: 'Patient_9023_Complete_Blood_Count.txt',
        relativePath: 'Clinical_Data/Hematology/Patient_9023_Complete_Blood_Count.txt',
        mimeType: 'text/plain',
        content: `MAYO CLINIC LABORATORIES
Specimen ID: MY-40192-CBC
Patient ID: PT-9023 (Age: 32, Female)
Collection Date: 2025-01-22 10:00 AM
Fasting: No (Non-fasting routine exam)
Ordering Physician: Dr. Sarah Lin, MD (Obstetrics & Gynecology)

COMPLETE BLOOD COUNT (CBC WITH DIFFERENTIAL):
- White Blood Cell (WBC): 6.8 x10^3/uL  [NORMAL]  (Normal: 4.0 - 11.0)
- Red Blood Cell (RBC): 3.9 x10^6/uL  [LOW]  (Normal: 4.2 - 5.4)
- Hemoglobin: 10.2 g/dL  [LOW]  (Normal: 12.0 - 16.0 g/dL)
- Hematocrit: 31.5 %  [LOW]  (Normal: 37.0 - 47.0 %)
- Platelets: 260 x10^3/uL  [NORMAL]  (Normal: 150 - 450)
- MCV: 74 fL  [LOW]  (Normal: 80 - 100 fL)

Clinical Impression: Microcytic hypochromic anemia, consistent with iron deficiency. Recommend ferritin testing and oral ferrous sulfate.`,
      },
      {
        name: 'Patient_4412_Endocrine_Thyroid.txt',
        relativePath: 'Clinical_Data/Endocrine/Patient_4412_Endocrine_Thyroid.txt',
        mimeType: 'text/plain',
        content: `QUEST DIAGNOSTICS CLINICAL REPORT
Specimen ID: SP-55102-THY
Patient ID: PT-4412 (Age: 41, Male)
Collection Date: 2025-02-28 09:10 AM
Fasting: No
Ordering Physician: Dr. Robert Keller, MD (Endocrinology)

THYROID COMPREHENSIVE CASCADE:
- TSH (Thyroid Stimulating Hormone): 6.85 uIU/mL  [HIGH]  (Normal: 0.45 - 4.50 uIU/mL)
- Free T4 (Thyroxine): 0.88 ng/dL  [NORMAL]  (Normal: 0.82 - 1.77 ng/dL)
- Free T3 (Triiodothyronine): 2.9 pg/mL  [NORMAL]  (Normal: 2.0 - 4.4 pg/mL)
- Thyroid Peroxidase (TPO) Antibodies: 142 IU/mL  [HIGH]  (Normal: <35 IU/mL)

Clinical Impression: Subclinical hypothyroidism with autoimmune Hashimoto's thyroiditis confirmation. Re-evaluate TSH in 8 weeks.`,
      },
    ],
  },
  {
    id: 'real-estate-folder',
    name: 'Real Estate Portfolio & Property Listings',
    description: 'Commercial & residential MLS property sheets, square footage, valuations, and cap rates.',
    icon: 'Building2',
    category: 'Real Estate & Assets',
    defaultSchema: {
      category: 'Real Estate Listings',
      spreadsheetTitle: 'Commercial & Residential Property Database',
      domainSummary: 'MLS property sheets, asking prices, zoning types, square footage, and lease terms.',
      columns: [
        { key: 'propertyAddress', label: 'Address', type: 'string', description: 'Street address' },
        { key: 'city', label: 'City', type: 'string', description: 'Municipality' },
        { key: 'propertyType', label: 'Property Type', type: 'tag', description: 'Single Family, Penthouse, Commercial Office, Industrial' },
        { key: 'price', label: 'Listing Price ($)', type: 'currency', description: 'Total asking price' },
        { key: 'squareFeet', label: 'Area (Sq Ft)', type: 'number', description: 'Usable building square footage' },
        { key: 'pricePerSqFt', label: 'Price / SqFt ($)', type: 'currency', description: 'Calculated price per sq foot' },
        { key: 'bedrooms', label: 'Beds', type: 'number', description: 'Bedrooms count if residential' },
        { key: 'bathrooms', label: 'Baths', type: 'number', description: 'Bathrooms count' },
        { key: 'yearBuilt', label: 'Year Built', type: 'number', description: 'Construction year' },
        { key: 'capRate', label: 'Cap Rate / Yield', type: 'string', description: 'Capitalization rate percentage if noted' },
      ],
      extractionInstructions: 'Extract prices as clean floating numbers. Format bedrooms and bathrooms as numbers. Note commercial vs residential.',
    },
    files: [
      {
        name: 'Skyline_Tower_Penthouse_14B.txt',
        relativePath: 'Portfolio/Downtown/Skyline_Tower_Penthouse_14B.txt',
        mimeType: 'text/plain',
        content: `METROPOLITAN LUXURY REALTY
Property Code: MLS-DT-10928
Listing Title: The Crown Penthouse at Skyline Tower
Address: 888 Grand Avenue, Unit 14B, Los Angeles, CA 90017
Neighborhood: Financial District

Property Details:
Type: Luxury Residential Penthouse Condominium
List Price: $3,450,000 USD
Square Footage: 3,120 Sq Ft
Price Per Square Foot: $1,105.77 / sqft
Bedrooms: 3 Master Suites
Bathrooms: 3.5 Designer Baths
Year Built: 2022
HOA Monthly Dues: $2,150

Features:
- 18-foot floor-to-ceiling panoramic glass walls with unobstructed sunset city views
- Private 600 sq ft wrap-around terrace with outdoor kitchen and gas fireplace
- Gaggenau culinary appliances, Italian marble waterfall island, 2 private EV parking spots`,
      },
      {
        name: 'Evergreen_Terrace_Family_Home.txt',
        relativePath: 'Portfolio/Suburbs/Evergreen_Terrace_Family_Home.txt',
        mimeType: 'text/plain',
        content: `PACIFIC NORTHWEST HOMES
MLS #: NW-771829
Address: 742 Evergreen Terrace, Bellevue, WA 98004

Overview:
Type: Single Family Residential Home
Asking Price: $1,895,000 USD
Living Area: 2,850 Sq Ft
Price / SqFt: $664.91
Bedrooms: 4 Bedrooms
Bathrooms: 3.0 Full Baths
Year Built: 2018
Lot Size: 0.28 Acres (12,196 sq ft)

Property Highlights:
- Top-rated Bellevue school district (Lakeview Elementary, Bellevue High)
- Open concept chef's kitchen with quartz counters and Sub-Zero refrigerator
- Covered heated patio with manicured private cedar fenced backyard
- Solar panels installed with Level 2 Tesla wall connector in 3-car garage`,
      },
      {
        name: 'TechPark_Plaza_Suite_400.txt',
        relativePath: 'Portfolio/Commercial/TechPark_Plaza_Suite_400.txt',
        mimeType: 'text/plain',
        content: `CBRE COMMERCIAL REAL ESTATE CAPITAL
Offering Memorandum: Suite 400 at TechPark Plaza
Address: 10400 Innovation Way, Austin, TX 78758

Commercial Investment Summary:
Asset Type: Class-A Commercial Tech Office Building
Offering Price: $8,750,000 USD
Gross Leasable Area: 18,500 Sq Ft
Price Per Sq Ft: $472.97
Year Built: 2020 (LEED Gold Certified)
Cap Rate: 7.25% Net Initial Yield
Current Occupancy: 100% Leased to High-Growth AI & Biotech Tenants
Weighted Average Lease Term (WALT): 4.8 Years
Net Operating Income (NOI): $634,375 Annual

Property Features:
- High-efficiency HVAC with UV-C air filtration
- Fiber redundant backbone connectivity with on-site backup generator
- Dedicated 85 subterranean parking spaces included`,
      },
      {
        name: 'Oakwood_Estate_Lot_12.txt',
        relativePath: 'Portfolio/Suburbs/Oakwood_Estate_Lot_12.txt',
        mimeType: 'text/plain',
        content: `SOTHEBY'S INTERNATIONAL REALTY
Listing ID: SIR-TX-4091
Address: 1204 Oakwood Hollow Lane, Westlake Hills, TX 78746

Property Description:
Type: Modern Architectural Estate
Listing Price: $4,995,000 USD
Interior Size: 5,420 Sq Ft
Price / Sq Ft: $921.58
Bedrooms: 5 Bedrooms (All En-Suite)
Bathrooms: 5.5 Bathrooms
Year Built: 2024 (Brand New Construction)
Lot Size: 1.15 Wooded Acres

Amenities & Architecture:
- Designed by Olson Kundig inspired architect with rammed earth & blackened steel facade
- Infinity edge swimming pool overlooking Texas Hill Country greenbelt
- 800-bottle temperature controlled wine room, home theater with 4K laser projection`,
      },
    ],
  },
];
