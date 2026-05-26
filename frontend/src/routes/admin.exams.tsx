import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { getAllExams } from "@/lib/api";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/admin/exams")({ component: AdminExamsPage });

function AdminExamsPage() {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    getAllExams().then((data) => setRows(data.results ?? data ?? [])).catch(() => setRows([]));
  }, []);
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">All exams</h1>
      <Card className="border-border/60">
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Title</TableHead><TableHead>Subject</TableHead>
              <TableHead>Date</TableHead><TableHead>Duration</TableHead><TableHead>Status</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {rows.map((e: any) => (
                <TableRow key={e.id}>
                  <TableCell className="font-medium">{e.title}</TableCell>
                  <TableCell>{e.subject ?? "General"}</TableCell>
                  <TableCell>{new Date(e.start_time).toLocaleDateString()}</TableCell>
                  <TableCell>{e.duration_minutes} min</TableCell>
                  <TableCell><Badge variant="outline" className="capitalize">{e.is_published ? "published" : "draft"}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
