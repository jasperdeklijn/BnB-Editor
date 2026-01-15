-- Remove transition column from website_sections table
alter table website_sections drop column if exists transition;
