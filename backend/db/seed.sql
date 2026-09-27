-- A small spread of realistic facilities so nearby search works across SA.
-- Coordinates are approximate and only meant for testing.
TRUNCATE facilities RESTART IDENTITY CASCADE;

INSERT INTO facilities (name, type, address, phone, emergency_phone, latitude, longitude, operating_hours, services) VALUES
  ('Chris Hani Baragwanath Hospital', 'hospital', '26 Chris Hani Rd, Diepkloof, Soweto', '011 933 8000', '10177', -26.2606, 27.9422,
    '{"mon_fri":"07:00-19:00","sat":"08:00-13:00","sun":"closed"}', ARRAY['Emergency','Maternity','Outpatient','Pharmacy']),

  ('Bara Mall Clinic', 'clinic', 'Old Potchefstroom Rd, Diepkloof, Soweto', '011 938 4000', NULL, -26.2551, 27.9355,
    '{"mon_fri":"08:00-16:00","sat":"08:00-12:00","sun":"closed"}', ARRAY['Primary Care','HIV Testing','Family Planning']),

  ('Alexandra Community Health Centre', 'clinic', '1 8th Ave, Alexandra, Johannesburg', '011 443 2200', NULL, -26.1045, 28.0929,
    '{"mon_fri":"07:30-16:00","sat":"08:00-12:00","sun":"closed"}', ARRAY['Primary Care','TB Clinic','Immunisations']),

  ('Khayelitsha District Hospital', 'hospital', 'Cnr Steve Biko & Walter Sisulu Rd, Khayelitsha, Cape Town', '021 360 4000', '10177', -34.0364, 18.6870,
    '{"mon_sun":"24h"}', ARRAY['Emergency','Maternity','Outpatient']),

  ('Site B Community Health Centre', 'clinic', 'Lwandle Rd, Khayelitsha, Cape Town', '021 361 1211', NULL, -34.0405, 18.6790,
    '{"mon_fri":"07:00-16:00","sat":"08:00-13:00","sun":"closed"}', ARRAY['Primary Care','ARV Clinic','Chronic Care']),

  ('Edendale Hospital', 'hospital', '89 Selby Msimang Rd, Plessislaer, Pietermaritzburg', '033 395 4111', '10177', -29.6428, 30.3361,
    '{"mon_sun":"24h"}', ARRAY['Emergency','Surgery','Paediatrics']),

  ('Soweto Pharmacy', 'pharmacy', 'Maponya Mall, Klipspruit, Soweto', '011 982 1100', NULL, -26.2419, 27.9077,
    '{"mon_fri":"09:00-19:00","sat":"09:00-17:00","sun":"10:00-14:00"}', ARRAY['Dispensary','Immunisations']),

  ('Dr Ndlovu Family Practice', 'practitioner', '12 Vilakazi St, Orlando West, Soweto', '011 936 5522', NULL, -26.2364, 27.9026,
    '{"mon_fri":"08:00-17:00","sat":"09:00-13:00","sun":"closed"}', ARRAY['General Practice','Chronic Care','Family Medicine']),

  ('Maritzburg Med Centre', 'practitioner', '45 Church St, Pietermaritzburg CBD', '033 345 6789', NULL, -29.6006, 30.3797,
    '{"mon_fri":"08:00-18:00","sat":"09:00-13:00","sun":"closed"}', ARRAY['General Practice','Travel Medicine']),

  ('Mitchells Plain Community Health Centre', 'clinic', '8th Ave, Mitchells Plain, Cape Town', '021 392 3111', NULL, -34.0344, 18.6180,
    '{"mon_fri":"07:00-16:00","sat":"08:00-12:00","sun":"closed"}', ARRAY['Primary Care','Dental','Mental Health']);