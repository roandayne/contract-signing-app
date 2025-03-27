class CreateSignatures < ActiveRecord::Migration[8.0]
  def change
    create_table :signatures do |t|
      t.references :user, null: false, foreign_key: true
      t.references :form, null: false, foreign_key: true
      t.string :signature_type
      t.text :signature_data
      t.float :position_x
      t.float :position_y

      t.timestamps
    end
  end
end
