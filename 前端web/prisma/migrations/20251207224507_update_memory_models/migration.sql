-- CreateTable
CREATE TABLE "pdf_highlights" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "book_id" TEXT,
    "file_url" TEXT NOT NULL,
    "page_index" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#FFEB3B',
    "highlight_areas" JSONB NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pdf_highlights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "grade" TEXT,
    "university" TEXT,
    "major" TEXT,
    "age" INTEGER,
    "learning_goal" TEXT,
    "exam_deadline" TIMESTAMP(3),
    "language_preference" TEXT NOT NULL DEFAULT '中文',
    "tone_preference" TEXT,
    "learning_style_preference" TEXT,
    "memory_text" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_understandings" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "book_id" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "understood" TEXT[],
    "not_understood" TEXT[],
    "memory_text" TEXT,
    "vector_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_understandings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_learnings" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "book_id" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "question_type" TEXT NOT NULL,
    "memory_text" TEXT,
    "vector_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_learnings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pdf_highlights_user_id_idx" ON "pdf_highlights"("user_id");

-- CreateIndex
CREATE INDEX "pdf_highlights_user_id_book_id_idx" ON "pdf_highlights"("user_id", "book_id");

-- CreateIndex
CREATE INDEX "pdf_highlights_user_id_file_url_idx" ON "pdf_highlights"("user_id", "file_url");

-- CreateIndex
CREATE UNIQUE INDEX "user_profiles_user_id_key" ON "user_profiles"("user_id");

-- CreateIndex
CREATE INDEX "user_understandings_user_id_idx" ON "user_understandings"("user_id");

-- CreateIndex
CREATE INDEX "user_understandings_user_id_book_id_idx" ON "user_understandings"("user_id", "book_id");

-- CreateIndex
CREATE INDEX "user_understandings_topic_idx" ON "user_understandings"("topic");

-- CreateIndex
CREATE UNIQUE INDEX "user_understandings_user_id_book_id_topic_key" ON "user_understandings"("user_id", "book_id", "topic");

-- CreateIndex
CREATE INDEX "user_learnings_user_id_idx" ON "user_learnings"("user_id");

-- CreateIndex
CREATE INDEX "user_learnings_user_id_book_id_idx" ON "user_learnings"("user_id", "book_id");

-- CreateIndex
CREATE INDEX "user_learnings_topic_idx" ON "user_learnings"("topic");

-- AddForeignKey
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_understandings" ADD CONSTRAINT "user_understandings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_understandings" ADD CONSTRAINT "user_understandings_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_learnings" ADD CONSTRAINT "user_learnings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_learnings" ADD CONSTRAINT "user_learnings_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE CASCADE ON UPDATE CASCADE;
