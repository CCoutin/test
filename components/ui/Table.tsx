import React, { ReactNode } from 'react';

interface TableProps {
  headers: string[];
  children: ReactNode;
}

const Table: React.FC<TableProps> = ({ headers, children }) => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            {headers.map((header, index) => (
              <th key={index} className="p-4 text-sm font-semibold text-slate-600 tracking-wider">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {children}
        </tbody>
      </table>
    </div>
  );
};

export default Table;
