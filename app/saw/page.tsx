import Layout from "@/components/Layout";

export default function SawPage() {
  return (
    <Layout>
      <h1 className="text-2xl font-bold mb-4">Hasil Perhitungan SAW</h1>

      <table className="w-full bg-white rounded-xl overflow-hidden shadow">
        <thead className="bg-blue-600 text-white">
          <tr>
            <th className="p-3">Ranking</th>
            <th>Nama</th>
            <th>Skor</th>
          </tr>
        </thead>
        <tbody>
          <tr className="text-center border-b">
            <td className="p-3">1</td>
            <td>Motor</td>
            <td>0.85</td>
          </tr>
        </tbody>
      </table>
    </Layout>
  );
}