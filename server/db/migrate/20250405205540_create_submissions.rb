class CreateSubmissions < ActiveRecord::Migration[8.0]
  def change
    create_table :submissions do |t|
      t.references :form, null: false, foreign_key: true
      t.references :user, null: true, foreign_key: true
      t.string :signer_name, null: false
      t.string :signer_email
      t.string :status, default: 'completed'
      t.text :annotations_data
      t.timestamps
    end

    add_index :submissions, [:form_id, :signer_email], unique: true
  end
end