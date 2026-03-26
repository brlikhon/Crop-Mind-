-- CropMind AlloyDB Setup Script
-- Run this in AlloyDB Studio (GCP Console > AlloyDB > your cluster > AlloyDB Studio)

-- Step 1: Enable extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS google_ml_integration;

-- Step 2: Create tables
CREATE TABLE IF NOT EXISTS conversations (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS crop_cases (
  id SERIAL PRIMARY KEY,
  case_id VARCHAR(64) NOT NULL UNIQUE,
  crop_type VARCHAR(100) NOT NULL,
  country VARCHAR(100) NOT NULL,
  region VARCHAR(200) NOT NULL,
  symptoms_text TEXT NOT NULL,
  diagnosis VARCHAR(300) NOT NULL,
  treatment_applied TEXT NOT NULL,
  outcome_score REAL NOT NULL CHECK (outcome_score BETWEEN 0 AND 1),
  resolved_at TIMESTAMP NOT NULL,
  embedding vector(768) NOT NULL
);

CREATE INDEX IF NOT EXISTS crop_cases_crop_type_idx ON crop_cases (crop_type);
CREATE INDEX IF NOT EXISTS crop_cases_country_idx ON crop_cases (country);

CREATE TABLE IF NOT EXISTS crop_alerts (
  id SERIAL PRIMARY KEY,
  alert_id VARCHAR(64) NOT NULL UNIQUE,
  crop_type VARCHAR(100) NOT NULL,
  region VARCHAR(200) NOT NULL,
  country VARCHAR(100) NOT NULL,
  threat_type VARCHAR(50) NOT NULL,
  threat_name VARCHAR(200) NOT NULL,
  severity VARCHAR(20) NOT NULL,
  description TEXT NOT NULL,
  advisory_text TEXT NOT NULL,
  affected_area_ha REAL,
  reported_date TIMESTAMP NOT NULL,
  expires_date TIMESTAMP,
  is_active BOOLEAN NOT NULL DEFAULT true,
  source VARCHAR(200)
);

CREATE TABLE IF NOT EXISTS market_prices (
  id SERIAL PRIMARY KEY,
  crop_type VARCHAR(100) NOT NULL,
  country VARCHAR(100) NOT NULL,
  market VARCHAR(200) NOT NULL,
  price_per_kg REAL NOT NULL,
  currency VARCHAR(10) NOT NULL,
  price_usd_per_kg REAL NOT NULL,
  week_of TIMESTAMP NOT NULL,
  price_change_7d REAL,
  price_change_30d REAL,
  volume VARCHAR(100),
  grade VARCHAR(50),
  source VARCHAR(200),
  notes TEXT
);

CREATE TABLE IF NOT EXISTS subsidies (
  id SERIAL PRIMARY KEY,
  program_id VARCHAR(64) NOT NULL UNIQUE,
  program_name VARCHAR(300) NOT NULL,
  country VARCHAR(100) NOT NULL,
  administered_by VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  eligible_crops TEXT NOT NULL,
  eligibility_criteria TEXT NOT NULL,
  benefit_type VARCHAR(100) NOT NULL,
  max_benefit_usd REAL,
  application_deadline TIMESTAMP,
  application_url VARCHAR(500),
  is_active BOOLEAN NOT NULL DEFAULT true,
  target_region VARCHAR(200),
  min_farm_size_ha REAL,
  max_farm_size_ha REAL,
  last_updated TIMESTAMP NOT NULL
);

-- Step 3: Seed crop alerts data (APAC agricultural threats)
INSERT INTO crop_alerts (alert_id, crop_type, region, country, threat_type, threat_name, severity, description, advisory_text, affected_area_ha, reported_date, expires_date, is_active, source) VALUES
('ALR-IN-001', 'rice', 'Punjab', 'India', 'disease', 'Bacterial Leaf Blight', 'high', 'Widespread BLB outbreak reported across Punjab rice paddies due to extended monsoon moisture and high temperatures above 30°C.', 'Apply streptomycin sulfate 500ppm. Drain fields immediately. Use copper oxychloride as preventive spray on adjacent fields. Report new outbreaks to district agriculture office.', 45000, '2026-03-01', '2026-06-30', true, 'ICAR-Indian Institute of Rice Research'),
('ALR-IN-002', 'rice', 'West Bengal', 'India', 'disease', 'Brown Spot', 'medium', 'Moderate brown spot incidence reported in Burdwan and Hooghly districts. Zinc deficient soils showing higher susceptibility.', 'Apply mancozeb 75 WP at 2g/L. Apply foliar zinc sulfate 0.5%. Ensure adequate drainage. Monitor fields weekly.', 12000, '2026-02-15', '2026-05-31', true, 'ICAR-Rice Research Institute'),
('ALR-IN-003', 'wheat', 'Punjab', 'India', 'disease', 'Yellow Rust', 'critical', 'Yellow rust race 110S119 detected in multiple districts. Rapid spread expected due to favorable cool and humid conditions.', 'Immediately apply propiconazole 25 EC at 0.1%. Switch to resistant varieties HD-3226 or PBW-826 for next season. Avoid late sowing. Monitor daily.', 78000, '2026-01-20', '2026-04-15', true, 'Punjab Agricultural University'),
('ALR-TH-001', 'rice', 'Central Plains', 'Thailand', 'pest', 'Brown Planthopper', 'high', 'BPH population surge in Nakhon Sawan and Suphan Buri provinces. Hopperburn damage reported in multiple paddies.', 'Apply imidacloprid 17.8 SL at recommended dose. Implement alternate wetting and drying. Avoid excessive nitrogen. Use light traps for monitoring.', 23000, '2026-02-20', '2026-05-31', true, 'Thai Rice Department'),
('ALR-TH-002', 'cassava', 'Nakhon Ratchasima', 'Thailand', 'disease', 'Sri Lankan Cassava Mosaic Virus', 'critical', 'SLCMV spreading rapidly via whitefly vectors. Multiple districts reporting mosaic symptoms on young plants.', 'Remove and destroy all infected plants. Use only certified clean planting stakes. Control whitefly with neonicotinoids. Plant resistant varieties KU50 or Rayong 72.', 35000, '2026-01-10', '2026-07-31', true, 'Thai Department of Agriculture'),
('ALR-PH-001', 'rice', 'Central Luzon', 'Philippines', 'pest', 'Rice Stem Borer', 'medium', 'Moderate stem borer infestation in Nueva Ecija and Tarlac. Deadheart symptoms in vegetative stage crops.', 'Release Trichogramma egg parasitoids at 100,000/ha. Apply fipronil 5G in whorl. Remove crop stubble after harvest. Use light traps.', 18000, '2026-02-01', '2026-06-30', true, 'PhilRice'),
('ALR-PH-002', 'banana', 'Mindanao', 'Philippines', 'disease', 'Fusarium Wilt TR4', 'critical', 'Panama disease TR4 confirmed in additional plantations in Davao del Norte. Strict quarantine measures required.', 'Quarantine affected areas immediately. Destroy infected plants with herbicide. Disinfect all equipment. Plant only tissue-cultured resistant varieties. Biosecurity protocols mandatory.', 5000, '2026-01-05', '2026-12-31', true, 'BPI Philippines'),
('ALR-VN-001', 'coffee', 'Central Highlands', 'Vietnam', 'disease', 'Coffee Leaf Rust', 'high', 'Hemileia vastatrix outbreak exceeding 40% defoliation in Dak Lak and Gia Lai provinces. Robusta plantations heavily affected.', 'Apply copper Bordeaux mixture 1% immediately. Prune for better air circulation. Plan replanting with resistant clones TR4, TR9. Apply systemic fungicide as backup.', 42000, '2026-02-10', '2026-06-30', true, 'Vietnam Coffee Association'),
('ALR-VN-002', 'rice', 'Mekong Delta', 'Vietnam', 'disease', 'Rice Tungro Virus', 'high', 'Tungro virus complex spreading in An Giang and Dong Thap provinces. Green leafhopper populations elevated.', 'Remove and burn infected plants. Control green leafhopper vectors with thiamethoxam. Plant tungro-tolerant varieties. Synchronize planting dates within district.', 28000, '2026-03-05', '2026-07-31', true, 'Vietnam Plant Protection Dept'),
('ALR-BD-001', 'rice', 'Rangpur', 'Bangladesh', 'pest', 'Yellow Stem Borer', 'medium', 'Stem borer incidence increasing in northern Bangladesh. Dead hearts and white ears reported in multiple upazilas.', 'Apply cartap hydrochloride 4G at 20kg/ha. Install pheromone traps at 5/ha. Practice clean cultivation. Clip egg masses during transplanting.', 15000, '2026-02-25', '2026-06-30', true, 'BRRI Bangladesh'),
('ALR-ID-001', 'palm oil', 'Kalimantan', 'Indonesia', 'pest', 'Rhinoceros Beetle', 'medium', 'Oryctes rhinoceros infestation in replanting areas. Damage to young palms in Kalimantan Selatan.', 'Apply Metarhizium anisopliae to breeding sites. Set up pheromone traps. Shred and compost old trunks. Protect young palms with wire mesh baskets.', 8000, '2026-01-15', '2026-08-31', true, 'Indonesian Oil Palm Research Institute'),
('ALR-ID-002', 'palm oil', 'Sabah', 'Malaysia', 'disease', 'Basal Stem Rot', 'high', 'Ganoderma BSR advancing in mature plantations in Sandakan and Lahad Datu divisions. Up to 30% infection in some blocks.', 'Apply soil mounding around palm base. Trunk injection with hexaconazole. Apply Trichoderma-based biocontrol. Mark infected palms for replanting priority.', 12000, '2026-02-05', '2026-12-31', true, 'MPOB Malaysia'),
('ALR-PK-001', 'cotton', 'Sindh', 'Pakistan', 'disease', 'Cotton Leaf Curl Disease', 'critical', 'CLCuD epidemic spreading through whitefly vectors in lower Sindh. Multiple districts reporting severe leaf curling and stunting.', 'Rogue infected plants immediately. Control whitefly with spiromesifen 22.9 SC. Plant only CLCuD-tolerant varieties next season. Avoid sequential cotton planting.', 55000, '2026-02-12', '2026-09-30', true, 'Pakistan Central Cotton Committee'),
('ALR-AU-001', 'wheat', 'New South Wales', 'Australia', 'disease', 'Stripe Rust', 'medium', 'Stripe rust detected in early-sown wheat in central western NSW. Favorable cool moist conditions forecast.', 'Apply epoxiconazole + pyraclostrobin at first sign. Monitor flag leaves closely. Resistant variety rotation recommended for next season.', 30000, '2026-03-10', '2026-06-30', true, 'NSW DPI Australia'),
('ALR-IN-004', 'tomato', 'Maharashtra', 'India', 'disease', 'Tomato Leaf Curl Virus', 'high', 'ToLCV outbreak in Nashik and Pune districts. Whitefly populations surging due to warm dry conditions.', 'Remove infected plants. Control whitefly with neem oil 3000ppm + imidacloprid. Use silver mulch to repel whiteflies. Plant resistant Arka Rakshak variety.', 6000, '2026-03-15', '2026-07-31', true, 'IIHR Bangalore');

-- Step 4: Seed market prices data (APAC crop markets)
INSERT INTO market_prices (crop_type, country, market, price_per_kg, currency, price_usd_per_kg, week_of, price_change_7d, price_change_30d, volume, grade, source, notes) VALUES
('rice', 'India', 'Punjab Mandi', 23.5, 'INR', 0.28, '2026-03-22', 1.2, 3.5, '45000 tonnes', 'Grade A Basmati', 'AGMARKNET India', 'Post-harvest season, prices stable'),
('rice', 'India', 'West Bengal Market', 18.0, 'INR', 0.22, '2026-03-22', -0.5, 2.1, '32000 tonnes', 'Swarna MTU7029', 'AGMARKNET India', 'Kharif stock clearance'),
('rice', 'Thailand', 'Bangkok Export', 17.8, 'THB', 0.51, '2026-03-22', 0.8, -1.2, '120000 tonnes', 'Thai Hom Mali 105', 'Thai Rice Exporters Assoc', 'Export demand from Africa steady'),
('rice', 'Vietnam', 'Ho Chi Minh Export', 12500, 'VND', 0.49, '2026-03-22', 1.5, 4.2, '85000 tonnes', '5% Broken', 'Vietnam Food Association', 'Strong Philippine and Indonesian demand'),
('rice', 'Philippines', 'Nueva Ecija Market', 42.0, 'PHP', 0.75, '2026-03-22', 2.1, 5.8, '15000 tonnes', 'Well-milled', 'Philippine Statistics Authority', 'Lean season, imports supplementing'),
('rice', 'Bangladesh', 'Dhaka Wholesale', 48.0, 'BDT', 0.40, '2026-03-22', 0.3, 1.8, '28000 tonnes', 'Aman HYV', 'DAM Bangladesh', 'Boro harvest approaching'),
('rice', 'Japan', 'Tokyo Wholesale', 380, 'JPY', 2.53, '2026-03-22', 0.1, 0.5, '8000 tonnes', 'Koshihikari First Grade', 'JA Japan', 'Premium domestic market stable'),
('rice', 'Indonesia', 'Jakarta Wholesale', 12800, 'IDR', 0.80, '2026-03-22', 1.8, 6.2, '35000 tonnes', 'Medium grain', 'Bulog Indonesia', 'Government stabilization operations active'),
('wheat', 'India', 'Delhi Wholesale', 28.5, 'INR', 0.34, '2026-03-22', 1.5, 4.8, '52000 tonnes', 'Lokwan', 'AGMARKNET India', 'MSP supported, rabi harvest beginning'),
('wheat', 'Pakistan', 'Lahore Market', 85.0, 'PKR', 0.30, '2026-03-22', 0.7, 2.3, '18000 tonnes', 'Standard', 'Pakistan PBS', 'Government procurement ongoing'),
('wheat', 'Australia', 'Sydney FOB', 0.38, 'AUD', 0.25, '2026-03-22', -0.3, -2.1, '250000 tonnes', 'APH Grade', 'ABARES Australia', 'Large harvest, export focused'),
('tomato', 'India', 'Nashik APMC', 35.0, 'INR', 0.42, '2026-03-22', 8.5, 15.2, '12000 tonnes', 'Hybrid', 'AGMARKNET India', 'Summer heat reducing supply, prices spiking'),
('cotton', 'India', 'Gujarat Mandi', 65.0, 'INR', 0.78, '2026-03-22', -1.2, -3.5, '8000 tonnes', 'Medium Staple', 'Cotton Corp India', 'Global demand soft'),
('cotton', 'Pakistan', 'Karachi Market', 235.0, 'PKR', 0.84, '2026-03-22', 0.5, 1.8, '5000 tonnes', 'Staple Length 28mm', 'PCGA Pakistan', 'Export quality premium'),
('coffee', 'Vietnam', 'Buon Ma Thuot', 98000, 'VND', 3.85, '2026-03-22', 3.2, 12.5, '42000 tonnes', 'Robusta Grade 1', 'Vietnam Coffee Cocoa Assoc', 'Global robusta shortage driving prices up'),
('palm oil', 'Indonesia', 'Medan FOB', 14500, 'IDR', 0.91, '2026-03-22', 1.1, -2.8, '180000 tonnes', 'CPO', 'GAPKI Indonesia', 'Biodiesel mandate supporting prices'),
('palm oil', 'Malaysia', 'Kuala Lumpur BMD', 4.15, 'MYR', 0.93, '2026-03-22', 0.8, -1.5, '120000 tonnes', 'CPO Futures', 'MPOB Malaysia', 'Production recovery, prices moderating'),
('sugarcane', 'India', 'UP Wholesale', 3.5, 'INR', 0.042, '2026-03-22', 0.0, 0.5, '95000 tonnes', 'Grade A Cane', 'ISMA India', 'FRP based procurement'),
('banana', 'Philippines', 'Davao Export', 22.0, 'PHP', 0.39, '2026-03-22', -0.3, 1.2, '55000 tonnes', 'Cavendish Export', 'Pilipino Banana Growers', 'Japan and China markets stable'),
('coconut', 'Philippines', 'Manila Wholesale', 45.0, 'PHP', 0.80, '2026-03-22', 2.5, 8.3, '18000 tonnes', 'Copra', 'PCA Philippines', 'Copra prices rising on coconut oil demand');

-- Step 5: Seed subsidies data (APAC government programs)
INSERT INTO subsidies (program_id, program_name, country, administered_by, description, eligible_crops, eligibility_criteria, benefit_type, max_benefit_usd, application_deadline, application_url, is_active, target_region, min_farm_size_ha, max_farm_size_ha, last_updated) VALUES
('SUB-IN-001', 'PM-KISAN (Pradhan Mantri Kisan Samman Nidhi)', 'India', 'Ministry of Agriculture & Farmers Welfare', 'Direct income support of Rs 6,000 per year in three installments to farmer families across India.', 'All crops', 'Must be land-owning farmer family. Aadhaar and bank account required. Exclusion for institutional holders and income tax payers.', 'Direct Cash Transfer', 72, '2026-12-31', 'https://pmkisan.gov.in', true, 'All India', 0, NULL, '2026-03-01'),
('SUB-IN-002', 'Pradhan Mantri Fasal Bima Yojana (PMFBY)', 'India', 'Ministry of Agriculture & Farmers Welfare', 'Comprehensive crop insurance scheme with premium subsidy covering natural calamities, pests, and diseases. Farmer pays 2% for Kharif, 1.5% for Rabi.', 'rice,wheat,cotton,sugarcane,pulses,oilseeds', 'All farmers including sharecroppers and tenant farmers. Must be growing notified crops in notified areas.', 'Insurance Premium Subsidy', 2400, '2026-07-31', 'https://pmfby.gov.in', true, 'All India', 0, NULL, '2026-03-01'),
('SUB-IN-003', 'Sub-Mission on Agricultural Mechanization (SMAM)', 'India', 'Ministry of Agriculture & Farmers Welfare', 'Subsidy of 50-80% on farm machinery including tractors, harvesters, drones for SC/ST/small/marginal farmers.', 'All crops', 'Small and marginal farmers with less than 2 hectares. SC/ST farmers get 80% subsidy, others 50%.', 'Equipment Subsidy', 600, '2026-09-30', 'https://agrimachinery.nic.in', true, 'All India', 0, 2, '2026-02-15'),
('SUB-TH-001', 'Rice Pledging Scheme', 'Thailand', 'Thai Ministry of Commerce', 'Government guaranteed rice price support program ensuring minimum price for paddy. Farmers can pledge rice as collateral.', 'rice', 'Thai rice farmers registered with Bank for Agriculture. Must grow within designated rice zones. Maximum 25 rai per household.', 'Price Guarantee', 1200, '2026-10-31', 'https://www.moac.go.th', true, 'All Thailand', 0, 4, '2026-03-10'),
('SUB-TH-002', 'Smart Farmer Program', 'Thailand', 'Thai Department of Agriculture', 'Technology adoption grants for precision agriculture, drone spraying, IoT sensors, and smart irrigation systems.', 'rice,cassava,sugarcane,rubber,fruit', 'Registered Thai farmer under 55 years old. Must complete Smart Farmer training. Farm size at least 1 rai.', 'Technology Grant', 800, '2026-08-31', 'https://www.doa.go.th', true, 'All Thailand', 0.16, NULL, '2026-02-20'),
('SUB-PH-001', 'Rice Competitiveness Enhancement Fund (RCEF)', 'Philippines', 'Department of Agriculture Philippines', 'Comprehensive support for rice farmers including free certified seeds, mechanization, credit, and extension services.', 'rice', 'Philippine rice farmers registered with RSBSA. Farm size up to 5 hectares.', 'Seeds + Machinery + Training', 500, '2026-12-31', 'https://www.da.gov.ph/rcef', true, 'All Philippines', 0, 5, '2026-03-05'),
('SUB-PH-002', 'Sikat Saka Financial Assistance Program', 'Philippines', 'Land Bank of the Philippines', 'Low-interest credit program for rice and corn farmers at 0% interest for first cycle and socialized credit.', 'rice,corn', 'Small farmers with not more than 3 hectares. Must be member of accredited farmers organization.', 'Low-Interest Credit', 1000, '2026-09-30', 'https://www.landbank.com', true, 'All Philippines', 0, 3, '2026-02-28'),
('SUB-VN-001', 'Vietnam Agricultural Modernization', 'Vietnam', 'Ministry of Agriculture and Rural Development', 'Interest rate subsidy and grants for agricultural technology adoption including post-harvest facilities and processing.', 'rice,coffee,pepper,cashew,seafood', 'Vietnamese agricultural enterprises and cooperatives. Priority for Mekong Delta and Central Highlands regions.', 'Interest Subsidy + Grant', 3000, '2026-11-30', 'https://www.mard.gov.vn', true, 'Mekong Delta,Central Highlands', 0.5, NULL, '2026-03-15'),
('SUB-BD-001', 'Agriculture Subsidy Card', 'Bangladesh', 'Ministry of Agriculture Bangladesh', 'Digital subsidy card providing fertilizer, seed, and fuel subsidies directly to registered farmers electronically.', 'rice,wheat,jute,vegetables', 'Bangladeshi farmers with national ID. Must register at local DAE office. Priority for marginal farmers.', 'Input Subsidy', 120, '2026-12-31', 'https://www.moa.gov.bd', true, 'All Bangladesh', 0, NULL, '2026-03-01'),
('SUB-ID-001', 'Pupuk Subsidi (Fertilizer Subsidy)', 'Indonesia', 'Ministry of Agriculture Indonesia', 'Subsidized fertilizer distribution through registered kiosks. Covers urea, SP-36, ZA, NPK, and organic fertilizer.', 'rice,corn,soybean,sugarcane,chili', 'Indonesian farmers registered in e-RDKK system with maximum 2 hectares. Quota based allocation per season.', 'Input Subsidy', 200, '2026-12-31', 'https://psp.pertanian.go.id', true, 'All Indonesia', 0, 2, '2026-02-10'),
('SUB-PK-001', 'Punjab Agriculture Credit Program', 'Pakistan', 'Punjab Agriculture Department', 'Low-interest revolving credit for crop inputs, mechanization, and irrigation improvement for Punjab farmers.', 'wheat,cotton,rice,sugarcane', 'Punjab-based farmers with land ownership documents. Maximum 12.5 acres. Bank account required.', 'Subsidized Credit', 600, '2026-06-30', 'https://www.agri.punjab.gov.pk', true, 'Punjab Pakistan', 0, 5, '2026-03-08'),
('SUB-MY-001', 'Padi Price Subsidy Scheme', 'Malaysia', 'Ministry of Agriculture Malaysia', 'Price subsidy of RM360/tonne for padi farmers plus RM200/ha production incentive to ensure food security.', 'rice', 'Malaysian padi farmers registered with Pertubuhan Peladang. Growing padi in gazetted granary areas.', 'Price Subsidy + Incentive', 350, '2026-12-31', 'https://www.moa.gov.my', true, 'Kedah,Perlis,Kelantan', 0, NULL, '2026-03-12'),
('SUB-AU-001', 'Farm Investment Corporation Fund', 'Australia', 'Department of Agriculture Australia', 'Tax-advantaged savings scheme allowing farmers to set aside pre-tax income in good years to draw upon in poor years.', 'wheat,cotton,beef,wool,dairy', 'Australian primary producers with off-farm income below threshold. ABN required.', 'Tax Benefit', 5000, '2026-06-30', 'https://www.agriculture.gov.au', true, 'All Australia', 0, NULL, '2026-02-28'),
('SUB-JP-001', 'Direct Payment for Paddy Conversion', 'Japan', 'Ministry of Agriculture Japan', 'Subsidies for rice farmers who diversify from rice to wheat, soybeans, or feed crops to address rice overproduction.', 'rice,wheat,soybean', 'Japanese rice farmers registered with JA. Must convert from paddy to designated upland crops.', 'Conversion Payment', 2800, '2026-09-30', 'https://www.maff.go.jp', true, 'All Japan', 0, NULL, '2026-03-01');

-- Verify
SELECT 'crop_alerts' as tbl, count(*) as cnt FROM crop_alerts
UNION ALL SELECT 'market_prices', count(*) FROM market_prices
UNION ALL SELECT 'subsidies', count(*) FROM subsidies
UNION ALL SELECT 'conversations', count(*) FROM conversations
UNION ALL SELECT 'crop_cases', count(*) FROM crop_cases;
