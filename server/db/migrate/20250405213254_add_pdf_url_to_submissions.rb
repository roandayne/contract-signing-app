class AddPdfUrlToSubmissions < ActiveRecord::Migration[8.0]
  def change
    add_column :submissions, :signed_pdf_url, :string, limit: 512
  end
end
