class AddUuidToForms < ActiveRecord::Migration[8.0]
  def change
    enable_extension 'pgcrypto' unless extension_enabled?('pgcrypto')
    add_column :forms, :uuid, :uuid, default: 'gen_random_uuid()', null: false
    add_index :forms, :uuid, unique: true
  end
end
