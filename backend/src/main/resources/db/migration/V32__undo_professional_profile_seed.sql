UPDATE users
SET professional_headline = NULL,
    professional_summary = NULL,
    education_summary = NULL,
    experience_summary = NULL,
    professional_skills = NULL
WHERE LOWER(full_name) = 'md ashraful utsho';
