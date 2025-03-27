class CreateForms < ActiveRecord::Migration[8.0]
  def change
    create_table :forms do |t|
      t.references :user, null: false, foreign_key: { on_delete: :cascade }
      t.string :file_name, null: false
      t.string :file_url, null: false, limit: 512
      t.string :file_type, null: false, limit: 10
      t.timestamps default: -> { 'CURRENT_TIMESTAMP' }
    end
  end
end