ALTER TABLE users
    ADD COLUMN professional_headline VARCHAR(160),
    ADD COLUMN professional_summary VARCHAR(800),
    ADD COLUMN education_summary VARCHAR(500),
    ADD COLUMN experience_summary VARCHAR(700),
    ADD COLUMN professional_skills VARCHAR(500);

UPDATE users
SET professional_headline = 'Computer Science Student · IT Support & Quality Professional',
    professional_summary = 'Computer Science and Engineering student with hands-on experience in IT support, quality control, customer service, and community volunteering. I enjoy solving practical problems, learning secure technologies, and creating clear digital experiences.',
    education_summary = 'BSc in Computer Science and Engineering · United International University',
    experience_summary = 'Quality Control Executive at BNS Food and Beverage · IT Support at Rush Tech Solutions · Volunteer at Ashia Foundation',
    professional_skills = 'Cybersecurity, IT Support, Quality Control, Problem Solving, Figma, Adobe XD, Photoshop, Premiere Pro'
WHERE LOWER(full_name) = 'md ashraful utsho';
