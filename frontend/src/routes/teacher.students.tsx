import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { getTeacherStudents } from "@/lib/api";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/teacher/students")({ component: StudentsPage });

function StudentsPage() {
  const [students, setStudents] = useState<any[]>([]);
  useEffect(() => {
    getTeacherStudents().then((data) => setStudents(data.students ?? [])).catch(() => setStudents([]));
  }, []);
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Students</h1>
      <Card className="border-border/60">
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Name</TableHead><TableHead>Email</TableHead>
              <TableHead>Status</TableHead><TableHead>Avg Score</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {students.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8"><AvatarFallback className="gradient-primary text-primary-foreground text-xs">{u.name.split(" ").map(n=>n[0]).join("")}</AvatarFallback></Avatar>
                      <span className="font-medium">{u.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{u.email}</TableCell>
                  <TableCell><Badge className={u.status === "active" ? "bg-success/20 text-success border-0" : "bg-destructive/20 text-destructive border-0"}>{u.status}</Badge></TableCell>
                  <TableCell>{Math.round(u.avg_score ?? 0)}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
