-- hierarchical course categories
CREATE TABLE "academy_course_categories" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "title" TEXT NOT NULL,
  "parentId" UUID REFERENCES "academy_course_categories"("id") ON DELETE SET NULL,
  "order" INTEGER NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- course required products with per-course pricing
CREATE TABLE "academy_course_products" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "courseId" UUID NOT NULL REFERENCES "academy_courses"("id") ON DELETE CASCADE,
  "productId" UUID REFERENCES "products"("id") ON DELETE SET NULL,
  "name" TEXT NOT NULL,
  "price" BIGINT NOT NULL DEFAULT 0,
  "qty" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "academy_course_products_courseId_idx" ON "academy_course_products"("courseId");

-- terms belong to a course
ALTER TABLE "academy_terms" ADD COLUMN "courseId" UUID REFERENCES "academy_courses"("id") ON DELETE SET NULL;

-- levels belong to course + term
ALTER TABLE "academy_levels" ADD COLUMN "courseId" UUID REFERENCES "academy_courses"("id") ON DELETE SET NULL;
ALTER TABLE "academy_levels" ADD COLUMN "termId" UUID REFERENCES "academy_terms"("id") ON DELETE SET NULL;

-- syllabi linked to course + term + level
ALTER TABLE "academy_syllabi" ADD COLUMN "termId" UUID REFERENCES "academy_terms"("id") ON DELETE SET NULL;
ALTER TABLE "academy_syllabi" ADD COLUMN "levelId" UUID REFERENCES "academy_levels"("id") ON DELETE SET NULL;

-- weekly schedule: hierarchy + class number
ALTER TABLE "academy_weekly_schedules" ADD COLUMN "termId" UUID REFERENCES "academy_terms"("id") ON DELETE SET NULL;
ALTER TABLE "academy_weekly_schedules" ADD COLUMN "levelId" UUID REFERENCES "academy_levels"("id") ON DELETE SET NULL;
ALTER TABLE "academy_weekly_schedules" ADD COLUMN "classNumber" TEXT;
