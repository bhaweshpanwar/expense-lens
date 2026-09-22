const fs = require('fs');
const path = require('path');

const dummyData = {
  user: {
    name: "Test User",
    email: "test@gmail.com",
    password: "password123",
    business_name: "Indore Electronics Hub",
    currency: "INR",
    language_pref: "en"
  },
  categories: [
    { name: "Sales", type: "income", icon: "shopping_cart" },
    { name: "Services", type: "income", icon: "build" },
    { name: "Other Income", type: "income", icon: "payments" },
    { name: "Rent", type: "expense", icon: "home" },
    { name: "Utilities", type: "expense", icon: "bolt" },
    { name: "Office Supplies", type: "expense", icon: "description" },
    { name: "Inventory/Stock Purchase", type: "expense", icon: "inventory" },
    { name: "Salaries", type: "expense", icon: "people" },
    { name: "Marketing", type: "expense", icon: "campaign" },
    { name: "Transport", type: "expense", icon: "local_shipping" },
    { name: "Maintenance", type: "expense", icon: "build" },
    { name: "Miscellaneous", type: "expense", icon: "more_horiz" }
  ],
  vendors: [
    { name: "Indore Electronics Wholesale Hub", default_category: "Inventory/Stock Purchase" },
    { name: "Global Semi-Conductors Ltd", default_category: "Inventory/Stock Purchase" },
    { name: "Rajesh Electricals", default_category: "Inventory/Stock Purchase" },
    { name: "Saraswati Components", default_category: "Inventory/Stock Purchase" },
    { name: "City Power Solutions", default_category: "Inventory/Stock Purchase" },
    { name: "MP State Electricity Board", default_category: "Utilities" },
    { name: "Indore Municipal Corporation", default_category: "Utilities" },
    { name: "Airtel Business", default_category: "Utilities" },
    { name: "Reliance Jio Enterprise", default_category: "Utilities" },
    { name: "Local Property Management Co", default_category: "Rent" },
    { name: "stationary Mart", default_category: "Office Supplies" },
    { name: "Print & Copy Hub", default_category: "Office Supplies" },
    { name: "Local Flyer Press", default_category: "Marketing" },
    { name: "Quick-Fix Repair Services", default_category: "Maintenance" },
    { name: "Clean-Up Pros Indore", default_category: "Maintenance" },
    { name: "Safe-Guard Security Systems", default_category: "Maintenance" },
    { name: "Ola Corporate", default_category: "Transport" },
    { name: "Uber for Business", default_category: "Transport" },
    { name: "Indore Logistics & Courier", default_category: "Transport" },
    { name: "City Bank India", default_category: "Miscellaneous" },
    { name: "Legal Advisor Sharma", default_category: "Miscellaneous" },
    { name: "Tax Consultant Gupta", default_category: "Miscellaneous" },
    { name: "Amazon Business", default_category: "Office Supplies" },
    { name: "Facebook Ads", default_category: "Marketing" },
    { name: "Google Ads", default_category: "Marketing" }
  ],
  budgets: [
    { category: "Inventory/Stock Purchase", limit_amount: 100000.00, period: "monthly", start_date: "2026-01-01" },
    { category: "Marketing", limit_amount: 20000.00, period: "monthly", start_date: "2026-01-01" },
    { category: null, limit_amount: 200000.00, period: "monthly", start_date: "2026-01-01" }
  ],
  savings_goals: [
    { target_amount: 500000.00, monthly_save_amount: 25000.00, target_date: "2027-01-01", status: "active" },
    { target_amount: 100000.00, monthly_save_amount: 10000.00, target_date: "2026-12-31", status: "active" }
  ],
  transactions: [
    // Rent
    { type: "expense", amount: 25000, category: "Rent", vendor: "Local Property Management Co", txn_date: "2026-04-01", notes: "Shop rent for April" },
    { type: "expense", amount: 25000, category: "Rent", vendor: "Local Property Management Co", txn_date: "2026-05-01", notes: "Shop rent for May" },
    { type: "expense", amount: 25000, category: "Rent", vendor: "Local Property Management Co", txn_date: "2026-06-01", notes: "Shop rent for June" },
    { type: "expense", amount: 25000, category: "Rent", vendor: "Local Property Management Co", txn_date: "2026-07-01", notes: "Shop rent for July" },
    { type: "expense", amount: 25000, category: "Rent", vendor: "Local Property Management Co", txn_date: "2026-08-01", notes: "Shop rent for August" },
    { type: "expense", amount: 25000, category: "Rent", vendor: "Local Property Management Co", txn_date: "2026-09-01", notes: "Shop rent for September" },

    // Salaries
    { type: "expense", amount: 12000, category: "Salaries", vendor: null, txn_date: "2026-04-30", notes: "Store assistant salary" },
    { type: "expense", amount: 12000, category: "Salaries", vendor: null, txn_date: "2026-05-30", notes: "Store assistant salary" },
    { type: "expense", amount: 12000, category: "Salaries", vendor: null, txn_date: "2026-06-30", notes: "Store assistant salary" },
    { type: "expense", amount: 12000, category: "Salaries", vendor: null, txn_date: "2026-07-30", notes: "Store assistant salary" },
    { type: "expense", amount: 12000, category: "Salaries", vendor: null, txn_date: "2026-08-30", notes: "Store assistant salary" },
    { type: "expense", amount: 12000, category: "Salaries", vendor: null, txn_date: "2026-09-20", notes: "Store assistant salary" },

    // Utilities - Electricity
    { type: "expense", amount: 4200, category: "Utilities", vendor: "MP State Electricity Board", txn_date: "2026-04-10", notes: "Electricity bill" },
    { type: "expense", amount: 4500, category: "Utilities", vendor: "MP State Electricity Board", txn_date: "2026-05-10", notes: "Electricity bill" },
    { type: "expense", amount: 4800, category: "Utilities", vendor: "MP State Electricity Board", txn_date: "2026-06-10", notes: "Electricity bill" },
    { type: "expense", amount: 5100, category: "Utilities", vendor: "MP State Electricity Board", txn_date: "2026-07-10", notes: "Electricity bill" },
    { type: "expense", amount: 5300, category: "Utilities", vendor: "MP State Electricity Board", txn_date: "2026-08-10", notes: "Electricity bill" },
    { type: "expense", amount: 4900, category: "Utilities", vendor: "MP State Electricity Board", txn_date: "2026-09-10", notes: "Electricity bill" },

    // Utilities - Internet
    { type: "expense", amount: 1200, category: "Utilities", vendor: "Airtel Business", txn_date: "2026-04-15", notes: "Internet bill" },
    { type: "expense", amount: 1200, category: "Utilities", vendor: "Airtel Business", txn_date: "2026-05-15", notes: "Internet bill" },
    { type: "expense", amount: 1200, category: "Utilities", vendor: "Airtel Business", txn_date: "2026-06-15", notes: "Internet bill" },
    { type: "expense", amount: 1200, category: "Utilities", vendor: "Airtel Business", txn_date: "2026-07-15", notes: "Internet bill" },
    { type: "expense", amount: 1200, category: "Utilities", vendor: "Airtel Business", txn_date: "2026-08-15", notes: "Internet bill" },
    { type: "expense", amount: 1200, category: "Utilities", vendor: "Airtel Business", txn_date: "2026-09-15", notes: "Internet bill" },

    // Inventory/Stock Purchase
    { type: "expense", amount: 45000, category: "Inventory/Stock Purchase", vendor: "Indore Electronics Wholesale Hub", txn_date: "2026-04-05", notes: "Bulk inventory" },
    { type: "expense", amount: 32000, category: "Inventory/Stock Purchase", vendor: "Global Semi-Conductors Ltd", txn_date: "2026-04-12", notes: "Microcontrollers" },
    { type: "expense", amount: 15000, category: "Inventory/Stock Purchase", vendor: "Rajesh Electricals", txn_date: "2026-04-20", notes: "Wiring supplies" },
    { type: "expense", amount: 50000, category: "Inventory/Stock Purchase", vendor: "Saraswati Components", txn_date: "2026-05-05", notes: "Capacitors bulk" },
    { type: "expense", amount: 28000, category: "Inventory/Stock Purchase", vendor: "City Power Solutions", txn_date: "2026-05-15", notes: "Power supplies" },
    { type: "expense", amount: 40000, category: "Inventory/Stock Purchase", vendor: "Indore Electronics Wholesale Hub", txn_date: "2026-06-02", notes: "Electronic components" },
    { type: "expense", amount: 35000, category: "Inventory/Stock Purchase", vendor: "Global Semi-Conductors Ltd", txn_date: "2026-06-18", notes: "Sensors bulk" },
    { type: "expense", amount: 12000, category: "Inventory/Stock Purchase", vendor: "Rajesh Electricals", txn_date: "2026-06-25", notes: "Connectors" },
    { type: "expense", amount: 55000, category: "Inventory/Stock Purchase", vendor: "Saraswati Components", txn_date: "2026-07-05", notes: "High-end chips" },
    { type: "expense", amount: 30000, category: "Inventory/Stock Purchase", vendor: "City Power Solutions", txn_date: "2026-07-20", notes: "Battery packs" },
    { type: "expense", amount: 42000, category: "Inventory/Stock Purchase", vendor: "Indore Electronics Wholesale Hub", txn_date: "2026-08-05", notes: "Stock refill" },
    { type: "expense", amount: 38000, category: "Inventory/Stock Purchase", vendor: "Global Semi-Conductors Ltd", txn_date: "2026-08-15", notes: "Integrated circuits" },
    { type: "expense", amount: 18000, category: "Inventory/Stock Purchase", vendor: "Rajesh Electricals", txn_date: "2026-08-28", notes: "Switchgear" },
    { type: "expense", amount: 60000, category: "Inventory/Stock Purchase", vendor: "Saraswati Components", txn_date: "2026-09-05", notes: "Bulk refill" },
    { type: "expense", amount: 31000, category: "Inventory/Stock Purchase", vendor: "City Power Solutions", txn_date: "2026-09-15", notes: "Transformers" },
    { type: "expense", amount: 220000, category: "Inventory/Stock Purchase", vendor: "Indore Electronics Wholesale Hub", txn_date: "2026-07-12", notes: "Quarterly stock refill" },

    // Maintenance
    { type: "expense", amount: 18000, category: "Maintenance", vendor: "Quick-Fix Repair Services", txn_date: "2026-04-18", notes: "AC servicing" },
    { type: "expense", amount: 3000, category: "Maintenance", vendor: "Clean-Up Pros Indore", txn_date: "2026-04-22", notes: "Deep cleaning" },
    { type: "expense", amount: 15000, category: "Maintenance", vendor: "Safe-Guard Security Systems", txn_date: "2026-05-10", notes: "CCTV maintenance" },
    { type: "expense", amount: 18000, category: "Maintenance", vendor: "Quick-Fix Repair Services", txn_date: "2026-06-18", notes: "Electrical panel repair" },
    { type: "expense", amount: 3000, category: "Maintenance", vendor: "Clean-Up Pros Indore", txn_date: "2026-06-22", notes: "Monthly cleaning" },
    { type: "expense", amount: 15000, category: "Maintenance", vendor: "Safe-Guard Security Systems", txn_date: "2026-07-10", notes: "Security system check" },
    { type: "expense", amount: 18000, category: "Maintenance", vendor: "Quick-Fix Repair Services", txn_date: "2026-08-18", notes: "AC servicing" },
    { type: "expense", amount: 3000, category: "Maintenance", vendor: "Clean-Up Pros Indore", txn_date: "2026-08-22", notes: "Monthly cleaning" },
    { type: "expense", amount: 15000, category: "Maintenance", vendor: "Safe-Guard Security Systems", txn_date: "2026-09-10", notes: "CCTV update" },
    { type: "expense", amount: 85000, category: "Maintenance", vendor: "Quick-Fix Repair Services", txn_date: "2026-08-25", notes: "Shop flooring upgrade" },

    // Office Supplies
    { type: "expense", amount: 1500, category: "Office Supplies", vendor: "stationary Mart", txn_date: "2026-04-02", notes: "Printer paper and ink" },
    { type: "expense", amount: 800, category: "Office Supplies", vendor: "Print & Copy Hub", txn_date: "2026-04-10", notes: "Business cards" },
    { type: "expense", amount: 2500, category: "Office Supplies", vendor: "Amazon Business", txn_date: "2026-05-05", notes: "Desk organizer" },
    { type: "expense", amount: 1500, category: "Office Supplies", vendor: "stationary Mart", txn_date: "2026-05-12", notes: "Ledgers and pens" },
    { type: "expense", amount: 1200, category: "Office Supplies", vendor: "Print & Copy Hub", txn_date: "2026-06-10", notes: "Invoice books" },
    { type: "expense", amount: 2000, category: "Office Supplies", vendor: "Amazon Business", txn_date: "2026-06-20", notes: "Keyboard and mouse" },
    { type: "expense", amount: 1500, category: "Office Supplies", vendor: "stationary Mart", txn_date: "2026-07-02", notes: "Printer paper" },
    { type: "expense", amount: 800, category: "Office Supplies", vendor: "Print & Copy Hub", txn_date: "2026-07-15", notes: "Marketing flyers" },
    { type: "expense", amount: 2200, category: "Office Supplies", vendor: "Amazon Business", txn_date: "2026-08-05", notes: "Office chair cushion" },
    { type: "expense", amount: 1500, category: "Office Supplies", vendor: "stationary Mart", txn_date: "2026-08-12", notes: "Stationery refill" },
    { type: "expense", amount: 1200, category: "Office Supplies", vendor: "Print & Copy Hub", txn_date: "2026-09-10", notes: "Invoice books" },
    { type: "expense", amount: 2000, category: "Office Supplies", vendor: "Amazon Business", txn_date: "2026-09-20", notes: "External hard drive" },
    { type: "expense", amount: 12000, category: "Office Supplies", vendor: "Amazon Business", txn_date: "2026-06-10", notes: "High-end label printer" },

    // Marketing
    { type: "expense", amount: 5000, category: "Marketing", vendor: "Facebook Ads", txn_date: "2026-04-15", notes: "Local target ads" },
    { type: "expense", amount: 5000, category: "Marketing", vendor: "Google Ads", txn_date: "2026-04-20", notes: "Search keywords" },
    { type: "expense", amount: 2000, category: "Marketing", vendor: "Local Flyer Press", txn_date: "2026-05-01", notes: "Pamphlet printing" },
    { type: "expense", amount: 5000, category: "Marketing", vendor: "Facebook Ads", txn_date: "2026-05-15", notes: "Local target ads" },
    { type: "expense", amount: 5000, category: "Marketing", vendor: "Google Ads", txn_date: "2026-05-20", notes: "Search keywords" },
    { type: "expense", amount: 2000, category: "Marketing", vendor: "Local Flyer Press", txn_date: "2026-06-01", notes: "Pamphlet printing" },
    { type: "expense", amount: 5000, category: "Marketing", vendor: "Facebook Ads", txn_date: "2026-06-15", notes: "Local target ads" },
    { type: "expense", amount: 5000, category: "Marketing", vendor: "Google Ads", txn_date: "2026-06-20", notes: "Search keywords" },
    { type: "expense", amount: 2000, category: "Marketing", vendor: "Local Flyer Press", txn_date: "2026-07-01", notes: "Pamphlet printing" },
    { type: "expense", amount: 5000, category: "Marketing", vendor: "Facebook Ads", txn_date: "2026-07-15", notes: "Local target ads" },
    { type: "expense", amount: 5000, category: "Marketing", vendor: "Google Ads", txn_date: "2026-07-20", notes: "Search keywords" },
    { type: "expense", amount: 2000, category: "Marketing", vendor: "Local Flyer Press", txn_date: "2026-08-01", notes: "Pamphlet printing" },
    { type: "expense", amount: 5000, category: "Marketing", vendor: "Facebook Ads", txn_date: "2026-08-15", notes: "Local target ads" },
    { type: "expense", amount: 5000, category: "Marketing", vendor: "Google Ads", txn_date: "2026-08-20", notes: "Search keywords" },
    { type: "expense", amount: 2000, category: "Marketing", vendor: "Local Flyer Press", txn_date: "2026-09-01", notes: "Pamphlet printing" },
    { type: "expense", amount: 5000, category: "Marketing", vendor: "Facebook Ads", txn_date: "2026-09-15", notes: "Local target ads" },
    { type: "expense", amount: 5000, category: "Marketing", vendor: "Google Ads", txn_date: "2026-09-20", notes: "Search keywords" },

    // Transport
    { type: "expense", amount: 800, category: "Transport", vendor: "Ola Corporate", txn_date: "2026-04-05", notes: "Trip to warehouse" },
    { type: "expense", amount: 600, category: "Transport", vendor: "Uber for Business", txn_date: "2026-04-15", notes: "Vendor meeting" },
    { type: "expense", amount: 1200, category: "Transport", vendor: "Indore Logistics & Courier", txn_date: "2026-04-25", notes: "Shipping" },
    { type: "expense", amount: 800, category: "Transport", vendor: "Ola Corporate", txn_date: "2026-05-05", notes: "Trip to warehouse" },
    { type: "expense", amount: 600, category: "Transport", vendor: "Uber for Business", txn_date: "2026-05-15", notes: "Vendor meeting" },
    { type: "expense", amount: 1200, category: "Transport", vendor: "Indore Logistics & Courier", txn_date: "2026-05-25", notes: "Shipping" },
    { type: "expense", amount: 800, category: "Transport", vendor: "Ola Corporate", txn_date: "2026-06-05", notes: "Trip to warehouse" },
    { type: "expense", amount: 600, category: "Transport", vendor: "Uber for Business", txn_date: "2026-06-15", notes: "Vendor meeting" },
    { type: "expense", amount: 1200, category: "Transport", vendor: "Indore Logistics & Courier", txn_date: "2026-06-25", notes: "Shipping" },
    { type: "expense", amount: 800, category: "Transport", vendor: "Ola Corporate", txn_date: "2026-07-05", notes: "Trip to warehouse" },
    { type: "expense", amount: 600, category: "Transport", vendor: "Uber for Business", txn_date: "2026-07-15", notes: "Vendor meeting" },
    { type: "expense", amount: 1200, category: "Transport", vendor: "Indore Logistics & Courier", txn_date: "2026-07-25", notes: "Shipping" },
    { type: "expense", amount: 800, category: "Transport", vendor: "Ola Corporate", txn_date: "2026-08-05", notes: "Trip to warehouse" },
    { type: "expense", amount: 600, category: "Transport", vendor: "Uber for Business", txn_date: "2026-08-15", notes: "Vendor meeting" },
    { type: "expense", amount: 1200, category: "Transport", vendor: "Indore Logistics & Courier", txn_date: "2026-08-25", notes: "Shipping" },
    { type: "expense", amount: 800, category: "Transport", vendor: "Ola Corporate", txn_date: "2026-09-05", notes: "Trip to warehouse" },
    { type: "expense", amount: 600, category: "Transport", vendor: "Uber for Business", txn_date: "2026-09-15", notes: "Vendor meeting" },
    { type: "expense", amount: 1200, category: "Transport", vendor: "Indore Logistics & Courier", txn_date: "2026-09-25", notes: "Shipping" },

    // Miscellaneous
    { type: "expense", amount: 2000, category: "Miscellaneous", vendor: "City Bank India", txn_date: "2026-04-01", notes: "Bank charges" },
    { type: "expense", amount: 5000, category: "Miscellaneous", vendor: "Legal Advisor Sharma", txn_date: "2026-04-15", notes: "Contract review" },
    { type: "expense", amount: 3000, category: "Miscellaneous", vendor: "Tax Consultant Gupta", txn_date: "2026-05-10", notes: "GST filing" },
    { type: "expense", amount: 2000, category: "Miscellaneous", vendor: "City Bank India", txn_date: "2026-05-01", notes: "Bank charges" },
    { type: "expense", amount: 5000, category: "Miscellaneous", vendor: "Legal Advisor Sharma", txn_date: "2026-05-15", notes: "Contract review" },
    { type: "expense", amount: 3000, category: "Miscellaneous", vendor: "Tax Consultant Gupta", txn_date: "2026-06-10", notes: "GST filing" },
    { type: "expense", amount: 2000, category: "Miscellaneous", vendor: "City Bank India", txn_date: "2026-06-01", notes: "Bank charges" },
    { type: "expense", amount: 5000, category: "Miscellaneous", vendor: "Legal Advisor Sharma", txn_date: "2026-06-15", notes: "Contract review" },
    { type: "expense", amount: 3000, category: "Miscellaneous", vendor: "Tax Consultant Gupta", txn_date: "2026-07-10", notes: "GST filing" },
    { type: "expense", amount: 2000, category: "Miscellaneous", vendor: "City Bank India", txn_date: "2026-07-01", notes: "Bank charges" },
    { type: "expense", amount: 5000, category: "Miscellaneous", vendor: "Legal Advisor Sharma", txn_date: "2026-07-15", notes: "Contract review" },
    { type: "expense", amount: 3000, category: "Miscellaneous", vendor: "Tax Consultant Gupta", txn_date: "2026-08-10", notes: "GST filing" },
    { type: "expense", amount: 2000, category: "Miscellaneous", vendor: "City Bank India", txn_date: "2026-08-01", notes: "Bank charges" },
    { type: "expense", amount: 5000, category: "Miscellaneous", vendor: "Legal Advisor Sharma", txn_date: "2026-08-15", notes: "Contract review" },
    { type: "expense", amount: 3000, category: "Miscellaneous", vendor: "Tax Consultant Gupta", txn_date: "2026-09-10", notes: "GST filing" },
    { type: "expense", amount: 2000, category: "Miscellaneous", vendor: "City Bank India", txn_date: "2026-09-01", notes: "Bank charges" },
    { type: "expense", amount: 5000, category: "Miscellaneous", vendor: "Legal Advisor Sharma", txn_date: "2026-09-15", notes: "Contract review" },

    // Income - Sales
    { type: "income", amount: 120000, category: "Sales", vendor: null, txn_date: "2026-04-05", notes: "Daily sales week 1" },
    { type: "income", amount: 135000, category: "Sales", vendor: null, txn_date: "2026-04-12", notes: "Daily sales week 2" },
    { type: "income", amount: 110000, category: "Sales", vendor: null, txn_date: "2026-04-19", notes: "Daily sales week 3" },
    { type: "income", amount: 140000, category: "Sales", vendor: null, txn_date: "2026-04-26", notes: "Daily sales week 4" },
    { type: "income", amount: 125000, category: "Sales", vendor: null, txn_date: "2026-05-03", notes: "Daily sales week 1" },
    { type: "income", amount: 140000, category: "Sales", vendor: null, txn_date: "2026-05-10", notes: "Daily sales week 2" },
    { type: "income", amount: 115000, category: "Sales", vendor: null, txn_date: "2026-05-17", notes: "Daily sales week 3" },
    { type: "income", amount: 150000, category: "Sales", vendor: null, txn_date: "2026-05-24", notes: "Daily sales week 4" },
    { type: "income", amount: 130000, category: "Sales", vendor: null, txn_date: "2026-06-01", notes: "Daily sales week 1" },
    { type: "income", amount: 145000, category: "Sales", vendor: null, txn_date: "2026-06-08", notes: "Daily sales week 2" },
    { type: "income", amount: 120000, category: "Sales", vendor: null, txn_date: "2026-06-15", notes: "Daily sales week 3" },
    { type: "income", amount: 160000, category: "Sales", vendor: null, txn_date: "2026-06-22", notes: "Daily sales week 4" },
    { type: "income", amount: 135000, category: "Sales", vendor: null, txn_date: "2026-07-01", notes: "Daily sales week 1" },
    { type: "income", amount: 150000, category: "Sales", vendor: null, txn_date: "2026-07-08", notes: "Daily sales week 2" },
    { type: "income", amount: 125000, category: "Sales", vendor: null, txn_date: "2026-07-15", notes: "Daily sales week 3" },
    { type: "income", amount: 170000, category: "Sales", vendor: null, txn_date: "2026-07-22", notes: "Daily sales week 4" },
    { type: "income", amount: 140000, category: "Sales", vendor: null, txn_date: "2026-08-01", notes: "Daily sales week 1" },
    { type: "income", amount: 155000, category: "Sales", vendor: null, txn_date: "2026-08-08", notes: "Daily sales week 2" },
    { type: "income", amount: 130000, category: "Sales", vendor: null, txn_date: "2026-08-15", notes: "Daily sales week 3" },
    { type: "income", amount: 180000, category: "Sales", vendor: null, txn_date: "2026-08-22", notes: "Daily sales week 4" },
    { type: "income", amount: 145000, category: "Sales", vendor: null, txn_date: "2026-09-01", notes: "Daily sales week 1" },
    { type: "income", amount: 160000, category: "Sales", vendor: null, txn_date: "2026-09-08", notes: "Daily sales week 2" },
    { type: "income", amount: 135000, category: "Sales", vendor: null, txn_date: "2026-09-15", notes: "Daily sales week 3" },
    { type: "income", amount: 190000, category: "Sales", vendor: null, txn_date: "2026-09-22", notes: "Daily sales week 4" },

    // Income - Services
    { type: "income", amount: 15000, category: "Services", vendor: null, txn_date: "2026-04-10", notes: "Repair service fee" },
    { type: "income", amount: 12000, category: "Services", vendor: null, txn_date: "2026-04-22", notes: "Custom circuit design" },
    { type: "income", amount: 15000, category: "Services", vendor: null, txn_date: "2026-05-10", notes: "Repair service fee" },
    { type: "income", amount: 18000, category: "Services", vendor: null, txn_date: "2026-05-22", notes: "Installation service" },
    { type: "income", amount: 15000, category: "Services", vendor: null, txn_date: "2026-06-10", notes: "Repair service fee" },
    { type: "income", amount: 12000, category: "Services", vendor: null, txn_date: "2026-06-22", notes: "Custom circuit design" },
    { type: "income", amount: 15000, category: "Services", vendor: null, txn_date: "2026-07-10", notes: "Repair service fee" },
    { type: "income", amount: 18000, category: "Services", vendor: null, txn_date: "2026-07-22", notes: "Installation service" },
    { type: "income", amount: 15000, category: "Services", vendor: null, txn_date: "2026-08-10", notes: "Repair service fee" },
    { type: "income", amount: 12000, category: "Services", vendor: null, txn_date: "2026-08-22", notes: "Custom circuit design" },
    { type: "income", amount: 15000, category: "Services", vendor: null, txn_date: "2026-09-10", notes: "Repair service fee" },
    { type: "income", amount: 18000, category: "Services", vendor: null, txn_date: "2026-09-22", notes: "Installation service" },

    // Income - Other Income
    { type: "income", amount: 5000, category: "Other Income", vendor: null, txn_date: "2026-05-15", notes: "Sale of old furniture" },
    { type: "income", amount: 2000, category: "Other Income", vendor: null, txn_date: "2026-08-10", notes: "Bank interest" }
  ]
};

const outputPath = path.join(__dirname, 'dummy_data.json');
fs.writeFileSync(outputPath, JSON.stringify(dummyData, null, 2), 'utf8');
console.log(`Successfully generated dummy_data.json at ${outputPath}`);
console.log(`Categories: ${dummyData.categories.length}`);
console.log(`Vendors: ${dummyData.vendors.length}`);
console.log(`Transactions: ${dummyData.transactions.length}`);
console.log(`Budgets: ${dummyData.budgets.length}`);
console.log(`Savings Goals: ${dummyData.savings_goals.length}`);
