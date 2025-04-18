# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.0].define(version: 2025_04_14_121507) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"
  enable_extension "pgcrypto"

  create_table "active_storage_attachments", force: :cascade do |t|
    t.string "name", null: false
    t.string "record_type", null: false
    t.bigint "record_id", null: false
    t.bigint "blob_id", null: false
    t.datetime "created_at", null: false
    t.index ["blob_id"], name: "index_active_storage_attachments_on_blob_id"
    t.index ["record_type", "record_id", "name", "blob_id"], name: "index_active_storage_attachments_uniqueness", unique: true
  end

  create_table "active_storage_blobs", force: :cascade do |t|
    t.string "key", null: false
    t.string "filename", null: false
    t.string "content_type"
    t.text "metadata"
    t.string "service_name", null: false
    t.bigint "byte_size", null: false
    t.string "checksum"
    t.datetime "created_at", null: false
    t.index ["key"], name: "index_active_storage_blobs_on_key", unique: true
  end

  create_table "active_storage_variant_records", force: :cascade do |t|
    t.bigint "blob_id", null: false
    t.string "variation_digest", null: false
    t.index ["blob_id", "variation_digest"], name: "index_active_storage_variant_records_uniqueness", unique: true
  end

  create_table "downloads", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.bigint "form_id", null: false
    t.datetime "downloaded_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["form_id"], name: "index_downloads_on_form_id"
    t.index ["user_id"], name: "index_downloads_on_user_id"
  end

  create_table "form_components", force: :cascade do |t|
    t.bigint "form_id", null: false
    t.string "original_filename", null: false
    t.integer "page_count", null: false
    t.integer "start_page", null: false
    t.integer "end_page", null: false
    t.integer "order_index", null: false
    t.datetime "created_at", default: -> { "CURRENT_TIMESTAMP" }, null: false
    t.datetime "updated_at", default: -> { "CURRENT_TIMESTAMP" }, null: false
    t.index ["form_id"], name: "index_form_components_on_form_id"
  end

  create_table "forms", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.string "file_name", null: false
    t.string "file_url", limit: 512, null: false
    t.string "file_type", limit: 10, null: false
    t.datetime "created_at", default: -> { "CURRENT_TIMESTAMP" }, null: false
    t.datetime "updated_at", default: -> { "CURRENT_TIMESTAMP" }, null: false
    t.string "signing_link"
    t.uuid "uuid", default: -> { "gen_random_uuid()" }, null: false
    t.bigint "submission_id"
    t.index ["submission_id"], name: "index_forms_on_submission_id"
    t.index ["user_id"], name: "index_forms_on_user_id"
    t.index ["uuid"], name: "index_forms_on_uuid", unique: true
  end

  create_table "signatures", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.bigint "form_id", null: false
    t.string "signature_type"
    t.text "signature_data"
    t.float "position_x"
    t.float "position_y"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.integer "page_number"
    t.index ["form_id"], name: "index_signatures_on_form_id"
    t.index ["user_id"], name: "index_signatures_on_user_id"
  end

  create_table "submissions", force: :cascade do |t|
    t.bigint "form_id", null: false
    t.bigint "user_id"
    t.string "signer_name", null: false
    t.string "signer_email"
    t.string "status", default: "completed"
    t.text "annotations_data"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "signed_pdf_url", limit: 512
    t.index ["form_id", "signer_email"], name: "index_submissions_on_form_id_and_signer_email", unique: true
    t.index ["form_id"], name: "index_submissions_on_form_id"
    t.index ["user_id"], name: "index_submissions_on_user_id"
  end

  create_table "users", force: :cascade do |t|
    t.string "email"
    t.string "password_digest"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.boolean "email_validated", default: false
    t.string "email_validation_token"
    t.index ["email"], name: "index_users_on_email", unique: true
    t.index ["email_validation_token"], name: "index_users_on_email_validation_token", unique: true
  end

  add_foreign_key "active_storage_attachments", "active_storage_blobs", column: "blob_id"
  add_foreign_key "active_storage_variant_records", "active_storage_blobs", column: "blob_id"
  add_foreign_key "downloads", "forms"
  add_foreign_key "downloads", "users"
  add_foreign_key "form_components", "forms", on_delete: :cascade
  add_foreign_key "forms", "submissions", on_delete: :nullify
  add_foreign_key "forms", "users", on_delete: :cascade
  add_foreign_key "signatures", "forms"
  add_foreign_key "signatures", "users"
  add_foreign_key "submissions", "forms"
  add_foreign_key "submissions", "users"
end
