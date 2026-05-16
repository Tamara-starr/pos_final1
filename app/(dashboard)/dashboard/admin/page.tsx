'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Settings, Users, Store, Shield, Printer, Receipt, Bell, Lock } from 'lucide-react'
import { toast } from 'sonner'
import ShiftReconciliation from '@/components/ShiftReconciliation'

export default function AdminPage() {
  const { user } = useAuth()
  const [dbUsers, setDbUsers] = useState<any[]>([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [taxRate, setTaxRate] = useState('7.5')
  const [storeName, setStoreName] = useState('Resort Mart')
  const [currency, setCurrency] = useState('NGN')
  const [printReceipt, setPrintReceipt] = useState(true)
  const [emailReceipts, setEmailReceipts] = useState(false)
  const [lowStockAlert, setLowStockAlert] = useState(true)
  const [lowStockThreshold, setLowStockThreshold] = useState('20')

  useEffect(() => {
    async function loadUsers() {
      setLoadingUsers(true)
      const { data, error } = await supabase
        .from('users')
        .select('user_id, first_name, last_name, username, role')
        .order('role')
      if (error) { console.error('Error loading users:', error.message); setLoadingUsers(false); return }
      setDbUsers(data || [])
      setLoadingUsers(false)
    }
    loadUsers()
  }, [])

  const getInitials = (firstName: string, lastName: string) =>
    `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase()

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin': return <Badge>Admin</Badge>
      case 'manager': return <Badge variant="secondary">Manager</Badge>
      default: return <Badge variant="outline">Cashier</Badge>
    }
  }

  const hasAccess = user?.role === 'admin' || user?.role === 'manager'

  if (!hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Shield className="w-16 h-16 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Access Restricted</h2>
        <p className="text-muted-foreground text-center max-w-sm">You do not have permission to access the admin panel.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Admin Panel</h1>
        <p className="text-muted-foreground">Manage system settings and users</p>
      </div>

      <Tabs defaultValue="users" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-[600px]">
         <TabsTrigger value="users" className="flex items-center gap-2"><Users className="w-4 h-4" />Users</TabsTrigger>
         <TabsTrigger value="settings" className="flex items-center gap-2"><Settings className="w-4 h-4" />Settings</TabsTrigger>
         <TabsTrigger value="reconciliation" className="flex items-center gap-2"><Receipt className="w-4 h-4" />Reconciliation</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-6">
          <div>
            <h3 className="text-lg font-medium">Staff Accounts</h3>
            <p className="text-sm text-muted-foreground">All users from your database</p>
          </div>
          <Card>
            {loadingUsers ? (
              <div className="flex items-center justify-center h-40 text-muted-foreground">Loading users...</div>
            ) : dbUsers.length === 0 ? (
              <div className="flex items-center justify-center h-40 text-muted-foreground">No users found</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Role</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dbUsers.map((u) => (
                    <TableRow key={u.user_id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-primary/10 text-primary text-xs">
                              {getInitials(u.first_name, u.last_name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{u.first_name} {u.last_name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{u.username}</TableCell>
                      <TableCell>{getRoleBadge(u.role)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Store className="w-5 h-5" />Store Settings</CardTitle><CardDescription>Configure your store information</CardDescription></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2"><Label>Store Name</Label><Input value={storeName} onChange={(e) => setStoreName(e.target.value)} /></div>
                <div className="space-y-2"><Label>Currency</Label><Input value={currency} onChange={(e) => setCurrency(e.target.value)} /></div>
                <div className="space-y-2"><Label>Tax Rate (%)</Label><Input type="number" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} min="0" max="100" step="0.1" /></div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Receipt className="w-5 h-5" />Receipt Settings</CardTitle><CardDescription>Configure receipt options</CardDescription></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div><Label className="text-base">Auto-print receipts</Label><p className="text-sm text-muted-foreground">Print after each sale</p></div>
                  <Switch checked={printReceipt} onCheckedChange={setPrintReceipt} />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div><Label className="text-base">QR digital receipts</Label><p className="text-sm text-muted-foreground">Show QR code after sale</p></div>
                  <Switch checked={emailReceipts} onCheckedChange={setEmailReceipts} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Bell className="w-5 h-5" />Notifications</CardTitle><CardDescription>Alert preferences</CardDescription></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div><Label className="text-base">Low stock alerts</Label><p className="text-sm text-muted-foreground">AI-powered restock alerts</p></div>
                  <Switch checked={lowStockAlert} onCheckedChange={setLowStockAlert} />
                </div>
                {lowStockAlert && (
                  <div className="pt-2">
                    <Label>Stock threshold</Label>
                    <Input type="number" value={lowStockThreshold} onChange={(e) => setLowStockThreshold(e.target.value)} className="mt-1.5 w-24" min="1" />
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Lock className="w-5 h-5" />Security</CardTitle><CardDescription>Access control settings</CardDescription></CardHeader>
              <CardContent className="space-y-4">
                <Button variant="outline" className="w-full justify-start"><Lock className="w-4 h-4 mr-2" />Change Password</Button>
                <Button variant="outline" className="w-full justify-start"><Printer className="w-4 h-4 mr-2" />Configure Printers</Button>
              </CardContent>
            </Card>
          </div>
          <div className="flex justify-end">
            <Button onClick={() => toast.success('Settings saved successfully')} className="px-8">Save Changes</Button>
          </div>
        </TabsContent>
         <TabsContent value="reconciliation">
          <ShiftReconciliation />
        </TabsContent>
      </Tabs>
    </div>
  )
}
