import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
  DropdownMenuRadioGroup, DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import { getAdminUsers, updateUserRole } from "@/lib/api";
import { useEffect } from "react";
import { Search, Plus, MoreVertical, ShieldCheck, GraduationCap, User as UserIcon } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/users")({ component: UsersPage });

type Role = "student" | "teacher" | "admin";
interface Row { id: string; name: string; email: string; role: Role; status: string }

const roleMeta: Record<Role, { label: string; icon: typeof UserIcon; className: string }> = {
  student: { label: "Student", icon: UserIcon, className: "border-primary/40 text-primary" },
  teacher: { label: "Teacher", icon: GraduationCap, className: "border-accent/40 text-accent" },
  admin: { label: "Admin", icon: ShieldCheck, className: "border-success/40 text-success" },
};

function UsersPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    getAdminUsers().then((data) => setRows((data.users ?? []).map((u: any) => ({ ...u, role: u.role as Role })))).catch(() => setRows([]));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q));
  }, [rows, query]);

  const changeRole = (id: string, role: Role) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, role } : r)));
    updateUserRole(id, role).then(() => {
      const u = rows.find((r) => r.id === id);
      toast.success(`${u?.name ?? "User"} is now a ${roleMeta[role].label.toLowerCase()}`);
    }).catch(() => toast.error("Failed to update role"));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">User management</h1>
        <Button className="gradient-primary text-primary-foreground"><Plus className="h-4 w-4 mr-1" /> Add user</Button>
      </div>
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search users…" className="pl-9" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>
      <Card className="border-border/60">
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>User</TableHead><TableHead>Email</TableHead>
              <TableHead>Role</TableHead><TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {filtered.map((u) => {
                const meta = roleMeta[u.role];
                const Icon = meta.icon;
                return (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8"><AvatarFallback className="gradient-primary text-primary-foreground text-xs">{u.name.split(" ").map(n=>n[0]).join("")}</AvatarFallback></Avatar>
                        <span className="font-medium">{u.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{u.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`gap-1 capitalize ${meta.className}`}>
                        <Icon className="h-3 w-3" /> {meta.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={u.status === "active" ? "bg-success/20 text-success border-0" : "bg-destructive/20 text-destructive border-0"}>{u.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">Change role</Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuLabel>Assign role</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuRadioGroup value={u.role} onValueChange={(v) => changeRole(u.id, v as Role)}>
                              <DropdownMenuRadioItem value="student"><UserIcon className="h-4 w-4 mr-2" />Student</DropdownMenuRadioItem>
                              <DropdownMenuRadioItem value="teacher"><GraduationCap className="h-4 w-4 mr-2" />Teacher</DropdownMenuRadioItem>
                              <DropdownMenuRadioItem value="admin"><ShieldCheck className="h-4 w-4 mr-2" />Admin</DropdownMenuRadioItem>
                            </DropdownMenuRadioGroup>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
