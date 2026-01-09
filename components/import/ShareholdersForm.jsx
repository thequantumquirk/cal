// File: ShareholdersForm.jsx
"use client";

export default function ShareholdersForm({ shareholders }) {
  if (!shareholders || shareholders.length === 0) {
    return <p className="text-sm text-gray-500">No shareholders parsed.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border border-border text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="p-2 border border-border text-muted-foreground font-medium">Account #</th>
            <th className="p-2 border border-border text-muted-foreground font-medium">First Name</th>
            <th className="p-2 border border-border text-muted-foreground font-medium">Last Name</th>
            <th className="p-2 border border-border text-muted-foreground font-medium">Address</th>
            <th className="p-2 border border-border text-muted-foreground font-medium">City</th>
            <th className="p-2 border border-border text-muted-foreground font-medium">State</th>
            <th className="p-2 border border-border text-muted-foreground font-medium">Zip</th>
            <th className="p-2 border border-border text-muted-foreground font-medium">Country</th>
            <th className="p-2 border border-border text-muted-foreground font-medium">Email</th>
            <th className="p-2 border border-border text-muted-foreground font-medium">Phone</th>
            <th className="p-2 border border-border text-muted-foreground font-medium">% Ownership</th>
          </tr>
        </thead>
        <tbody>
          {shareholders.map((sh, i) => (
            <tr key={i} className="bg-background hover:bg-muted/50 transition-colors">
              <td className="p-2 border border-border text-foreground">{sh.account_number}</td>
              <td className="p-2 border border-border text-foreground">{sh.first_name}</td>
              <td className="p-2 border border-border text-foreground">{sh.last_name}</td>
              <td className="p-2 border border-border text-foreground">{sh.address}</td>
              <td className="p-2 border border-border text-foreground">{sh.city}</td>
              <td className="p-2 border border-border text-foreground">{sh.state}</td>
              <td className="p-2 border border-border text-foreground">{sh.zip}</td>
              <td className="p-2 border border-border text-foreground">{sh.country}</td>
              <td className="p-2 border border-border text-foreground">{sh.email}</td>
              <td className="p-2 border border-border text-foreground">{sh.phone}</td>
              <td className="p-2 border border-border text-foreground">{sh.ownership_percentage || 0}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
