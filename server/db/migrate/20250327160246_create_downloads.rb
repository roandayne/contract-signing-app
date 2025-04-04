class CreateDownloads < ActiveRecord::Migration[8.0]
  def change
    create_table :downloads do |t|
      t.references :user, null: false, foreign_key: true
      t.references :form, null: false, foreign_key: true
      t.datetime :downloaded_at

      t.timestamps
    end
  end
end
