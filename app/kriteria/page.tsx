import Layout from "@/components/Layout";

export default function Kriteria() {
  return (
    <Layout>
      <h1 className="text-2xl font-bold mb-4">Input Kriteria</h1>

      <div className="bg-white p-6 rounded-xl shadow space-y-3">
        <input type="text" placeholder="Nama Kriteria" className="border p-2 w-full" />

        <input type="number" placeholder="Bobot (0.2)" className="border p-2 w-full" />

        <select className="border p-2 w-full">
          <option value="cost">Cost</option>
          <option value="benefit">Benefit</option>
        </select>

        <button className="bg-blue-600 text-white px-4 py-2 rounded">
          Simpan
        </button>
      </div>
    </Layout>
  );
}