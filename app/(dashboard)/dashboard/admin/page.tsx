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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Settings, Users, Store, Shield, Printer, Receipt, Bell, Lock, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import ShiftReconciliation from '@/components/ShiftReconciliation'

export default function AdminPage() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const hasAccess = user?.role === 'admin' || user?.role === 'manager'

  // ── Users state ───────────────────────────────────────────────────
  const [dbUsers, setDbUsers] = useState<any[]>([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [addUserOpen, setAddUserOpen] = useState(false)
  const [savingUser, setSavingUser] = useState(false)
  const [newFirstName, setNewFirstName] = useState('')
  const [newLastName, setNewLastName] = useState('')
  const [newUsername, setNewUsername] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newRole, setNewRole] = useState('cashier')

  // ── Settings state ────────────────────────────────────────────────
  const [settingsId, setSettingsId] = useState<number | null>(null)
  const [storeName, setStoreName] = useState('Resort Mart')
  const [currency, setCurrency] = useState('NGN')
  const [taxRate, setTaxRate] = useState('7.5')
  const [printReceipt, setPrintReceipt] = useState(true)
  const [qrReceipts, setQrReceipts] = useState(true)
  const [lowStockAlert, setLowStockAlert] = useState(true)
  const [lowStockThreshold, setLowStockThreshold] = useState('20')
  const [savingSettings, setSavingSettings] = useState(false)
  const [loadingSettings, setLoadingSettings] = useState(true)

  // ── Load users ────────────────────────────────────────────────────
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

  // ── Load settings ─────────────────────────────────────────────────
  async function loadSettings() {
    setLoadingSettings(true)
    const { data } = await supabase
      .from('settings')
      .select('*')
      .single()
    if (data) {
      setSettingsId(data.id)
      setStoreName(data.store_name)
      setCurrency(data.currency)
      setTaxRate(String(data.tax_rate))
      setPrintReceipt(data.auto_print_receipts)
      setQrReceipts(data.qr_digital_receipts)
      setLowStockAlert(data.low_stock_alerts)
      setLowStockThreshold(String(data.low_stock_threshold))
    }
    setLoadingSettings(false)
  }

  useEffect(() => {
    loadUsers()
    loadSettings()
  }, [])

  // ── Save settings ─────────────────────────────────────────────────
  const handleSaveSettings = async () => {
    if (!isAdmin) { toast.error('Only admins can change settings.'); return }
    setSavingSettings(true)
    const { error } = await supabase
      .from('settings')
      .update({
        store_name: storeName,
        currency,
        tax_rate: parseFloat(taxRate),
        auto_print_receipts: printReceipt,
        qr_digital_receipts: qrReceipts,
        low_stock_alerts: lowStockAlert,
        low_stock_threshold: parseInt(lowStockThreshold),
        updated_at: new Date().toISOString(),
        updated_by: user?.name,
      })
      .eq('id', settingsId)
    if (error) { toast.error('Failed to save settings: ' + error.message); setSavingSettings(false); return }
    toast.success('Settings saved successfully.')
    setSavingSettings(false)
  }

  // ── Add staff user ────────────────────────────────────────────────
  const handleAddUser = async () => {
    if (!newFirstName || !newLastName || !newUsername || !newPassword) {
      toast.error('Please fill in all fields.')
      return
    }
    setSavingUser(true)

    // Check username is not taken
    const { data: existing } = await supabase
      .from('users')
      .select('user_id')
      .eq('username', newUsername)
      .single()

    if (existing) {
      toast.error('Username already exists. Choose a different one.')
      setSavingUser(false)
      return
    }

    const { error } = await supabase.from('users').insert({
      first_name: newFirstName,
      last_name: newLastName,
      username: newUsername,
      passwd_hash: newPassword,
      role: newRole,
    })

    if (error) { toast.error('Failed to add user: ' + error.message); setSavingUser(false); return }

    toast.success(`${newFirstName} ${newLastName} added as ${newRole}.`)
    setNewFirstName('')
    setNewLastName('')
    setNewUsername('')
    setNewPassword('')
    setNewRole('cashier')
    setAddUserOpen(false)
    loadUsers()
    setSavingUser(false)
  }

  // ── Delete staff user ─────────────────────────────────────────────
  const handleDeleteUser = async (userId: number, name: string) => {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('user_id', userId)
    if (error) { toast.error('Failed to delete user: ' + error.message); return }
    toast.success(`${name} has been removed.`)
    loadUsers()
  }

  const getInitials = (firstName: string, lastName: string) =>
    `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase()

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin': return <Badge>Admin</Badge>
      case 'manager': return <Badge variant="secondary">Manager</Badge>
      case 'inventory_officer': return <Badge variant="outline">Inventory</Badge>
      default: return <Badge variant="outline">Cashier</Badge>
    }
  }

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

        {/* ── Users Tab ─────────────────────────────────────────── */}
        <TabsContent value="users" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium">Staff Accounts</h3>
              <p className="text-sm text-muted-foreground">All users from your database</p>
            </div>
            {isAdmin && (
              <Dialog open={addUserOpen} onOpenChange={setAddUserOpen}>
                <DialogTrigger asChild>
                  <Button className="flex items-center gap-2">
                    <Plus className="w-4 h-4" />Add Staff
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Add New Staff Member</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-2">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label>First Name <span className="text-red-500">*</span></Label>
                        <Input placeholder="John" value={newFirstName} onChange={(e) => setNewFirstName(e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Last Name <span className="text-red-500">*</span></Label>
                        <Input placeholder="Doe" value={newLastName} onChange={(e) => setNewLastName(e.target.value)} />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Username <span className="text-red-500">*</span></Label>
                      <Input placeholder="johndoe" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Password <span className="text-red-500">*</span></Label>
                      <Input type="password" placeholder="••••••••" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Role</Label>
                      <Select value={newRole} onValueChange={setNewRole}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cashier">Cashier</SelectItem>
                          <SelectItem value="inventory_officer">Inventory Officer</SelectItem>
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex gap-3 pt-2">
                      <Button variant="outline" className="flex-1" onClick={() => setAddUserOpen(false)}>Cancel</Button>
                      <Button className="flex-1" onClick={handleAddUser} disabled={savingUser}>
                        {savingUser ? 'Adding…' : 'Add Staff Member'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
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
                    {isAdmin && <TableHead className="w-[60px]"></TableHead>}
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
                      {isAdmin && (
                        <TableCell>
                          {u.username !== user?.email && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Staff Member</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to remove {u.first_name} {u.last_name}? This cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteUser(u.user_id, `${u.first_name} ${u.last_name}`)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>

        {/* ── Settings Tab ──────────────────────────────────────── */}
        <TabsContent value="settings" className="space-y-6">
          {loadingSettings ? (
            <div className="flex items-center justify-center h-40 text-muted-foreground">Loading settings...</div>
          ) : (
            <>
              {!isAdmin && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
                  ⚠️ You are viewing settings in read-only mode. Only admins can make changes.
                </div>
              )}
              <div className="grid lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Store className="w-5 h-5" />Store Settings</CardTitle><CardDescription>Configure your store information</CardDescription></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2"><Label>Store Name</Label><Input value={storeName} onChange={(e) => setStoreName(e.target.value)} disabled={!isAdmin} /></div>
                    <div className="space-y-2"><Label>Currency</Label><Input value={currency} onChange={(e) => setCurrency(e.target.value)} disabled={!isAdmin} /></div>
                    <div className="space-y-2"><Label>Tax Rate (%)</Label><Input type="number" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} min="0" max="100" step="0.1" disabled={!isAdmin} /></div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Receipt className="w-5 h-5" />Receipt Settings</CardTitle><CardDescription>Configure receipt options</CardDescription></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div><Label className="text-base">Auto-print receipts</Label><p className="text-sm text-muted-foreground">Print after each sale</p></div>
                      <Switch checked={printReceipt} onCheckedChange={setPrintReceipt} disabled={!isAdmin} />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div><Label className="text-base">QR digital receipts</Label><p className="text-sm text-muted-foreground">Show QR code after sale</p></div>
                      <Switch checked={qrReceipts} onCheckedChange={setQrReceipts} disabled={!isAdmin} />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Bell className="w-5 h-5" />Notifications</CardTitle><CardDescription>Alert preferences</CardDescription></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div><Label className="text-base">Low stock alerts</Label><p className="text-sm text-muted-foreground">AI-powered restock alerts</p></div>
                      <Switch checked={lowStockAlert} onCheckedChange={setLowStockAlert} disabled={!isAdmin} />
                    </div>
                    {lowStockAlert && (
                      <div className="pt-2">
                        <Label>Stock threshold</Label>
                        <Input type="number" value={lowStockThreshold} onChange={(e) => setLowStockThreshold(e.target.value)} className="mt-1.5 w-24" min="1" disabled={!isAdmin} />
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Lock className="w-5 h-5" />Security</CardTitle><CardDescription>Access control settings</CardDescription></CardHeader>
                  <CardContent className="space-y-4">
                    <Button variant="outline" className="w-full justify-start" disabled={!isAdmin}><Lock className="w-4 h-4 mr-2" />Change Password</Button>
                    <Button variant="outline" className="w-full justify-start" disabled={!isAdmin}><Printer className="w-4 h-4 mr-2" />Configure Printers</Button>
                  </CardContent>
                </Card>
              </div>

              {isAdmin && (
                <div className="flex justify-end">
                  <Button onClick={handleSaveSettings} disabled={savingSettings} className="px-8">
                    {savingSettings ? 'Saving…' : 'Save Changes'}
                  </Button>
                </div>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="reconciliation">
          <ShiftReconciliation />
        </TabsContent>
      </Tabs>
    </div>
  )
}