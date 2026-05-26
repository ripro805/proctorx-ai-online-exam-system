import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { getAdminTeachers } from "@/lib/api";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/admin/teachers")({ component: TeachersPage });

function TeachersPage() {
  const [teachers, setTeachers] = useState<any[]>([]);
  useEffect(() => {
    getAdminTeachers().then((data) => setTeachers(data.teachers ?? []))
      .catch(() => setTeachers([]));
  }, []);
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Teacher management</h1>
      <Card className="border-border/60">
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Name</TableHead><TableHead>Email</TableHead>
              <TableHead>Exams created</TableHead><TableHead>Status</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {teachers.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell className="text-muted-foreground">{u.email}</TableCell>
                  <TableCell>{u.exams_created ?? 0}</TableCell>
                  <TableCell><Badge className={u.status === "active" ? "bg-success/20 text-success border-0" : "bg-destructive/20 text-destructive border-0"}>{u.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
