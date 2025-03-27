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

ActiveRecord::Schema[8.0].define(version: 2025_03_27_160246) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"

  create_table "downloads", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.bigint "form_id", null: false
    t.datetime "downloaded_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["form_id"], name: "index_downloads_on_form_id"
    t.index ["user_id"], name: "index_downloads_on_user_id"
  end

  create_table "forms", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.string "file_name", null: false
    t.string "file_url", limit: 512, null: false
    t.string "file_type", limit: 10, null: false
    t.datetime "created_at", default: -> { "CURRENT_TIMESTAMP" }, null: false
    t.datetime "updated_at", default: -> { "CURRENT_TIMESTAMP" }, null: false
    t.index ["user_id"], name: "index_forms_on_user_id"
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
    t.index ["form_id"], name: "index_signatures_on_form_id"
    t.index ["user_id"], name: "index_signatures_on_user_id"
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

  add_foreign_key "downloads", "forms"
  add_foreign_key "downloads", "users"
  add_foreign_key "forms", "users", on_delete: :cascade
  add_foreign_key "signatures", "forms"
  add_foreign_key "signatures", "users"
end
