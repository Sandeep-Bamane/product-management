-- AlterTable
ALTER TABLE "bulk_upload_jobs" ADD COLUMN     "created_by_id" TEXT;

-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "created_by_id" TEXT,
ADD COLUMN     "updated_by_id" TEXT;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bulk_upload_jobs" ADD CONSTRAINT "bulk_upload_jobs_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
