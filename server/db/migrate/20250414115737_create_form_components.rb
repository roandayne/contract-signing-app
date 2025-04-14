class CreateFormComponents < ActiveRecord::Migration[8.0]
  def change
    create_table :form_components do |t|
      t.references :form, null: false, foreign_key: { on_delete: :cascade }
      t.string :original_filename, null: false
      t.integer :page_count, null: false
      t.integer :start_page, null: false
      t.integer :end_page, null: false
      t.integer :order_index, null: false
      t.timestamps default: -> { 'CURRENT_TIMESTAMP' }
    end
  end
end
