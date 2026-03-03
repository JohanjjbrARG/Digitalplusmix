import { useState, useEffect } from 'react';
import { Calendar, DollarSign, Users, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { invoicesAPI, clientsAPI } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/components/ui/table';
import { Badge } from '@/app/components/ui/badge';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';

interface DailyInvoice {
  id: string;
  clientId: string;
  clientName: string;
  amount: number;
  status: string;
  description: string;
  createdAt: string;
}

interface NewClient {
  id: string;
  name: string;
  email: string;
  phone: string;
  planName: string;
  monthlyFee: number;
  joinDate: string;
}

export function DailyReport() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [dailyInvoices, setDailyInvoices] = useState<DailyInvoice[]>([]);
  const [newClients, setNewClients] = useState<NewClient[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalAmount: 0,
    paidAmount: 0,
    pendingAmount: 0,
    newClientsCount: 0,
  });

  useEffect(() => {
    loadDailyData();
  }, [selectedDate]);

  const loadDailyData = async () => {
    try {
      setLoading(true);

      // Fecha de inicio y fin del día seleccionado
      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);

      // Cargar facturas del día
      const { data: invoicesData, error: invoicesError } = await supabase
        .from('invoices')
        .select('*')
        .gte('created_at', startOfDay.toISOString())
        .lte('created_at', endOfDay.toISOString())
        .order('created_at', { ascending: false });

      if (invoicesError) throw invoicesError;

      // Obtener nombres de clientes
      const invoicesWithClientNames = await Promise.all(
        (invoicesData || []).map(async (invoice) => {
          try {
            const { data: clientData } = await supabase
              .from('clients')
              .select('name')
              .eq('id', invoice.client_id)
              .single();

            return {
              id: invoice.id,
              clientId: invoice.client_id,
              clientName: clientData?.name || 'Cliente Desconocido',
              amount: invoice.amount,
              status: invoice.status,
              description: invoice.description,
              createdAt: invoice.created_at,
            };
          } catch (error) {
            return {
              id: invoice.id,
              clientId: invoice.client_id,
              clientName: 'Cliente Desconocido',
              amount: invoice.amount,
              status: invoice.status,
              description: invoice.description,
              createdAt: invoice.created_at,
            };
          }
        })
      );

      setDailyInvoices(invoicesWithClientNames);

      // Calcular estadísticas
      const totalAmount = invoicesWithClientNames.reduce((sum, inv) => sum + inv.amount, 0);
      const paidAmount = invoicesWithClientNames
        .filter((inv) => inv.status === 'paid')
        .reduce((sum, inv) => sum + inv.amount, 0);
      const pendingAmount = invoicesWithClientNames
        .filter((inv) => inv.status !== 'paid')
        .reduce((sum, inv) => sum + inv.amount, 0);

      // Cargar clientes nuevos del día
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('*')
        .gte('join_date', startOfDay.toISOString())
        .lte('join_date', endOfDay.toISOString())
        .order('join_date', { ascending: false });

      if (clientsError) throw clientsError;

      const newClientsFormatted = (clientsData || []).map((client) => ({
        id: client.id,
        name: client.name,
        email: client.email,
        phone: client.phone,
        planName: client.plan_name,
        monthlyFee: client.monthly_fee,
        joinDate: client.join_date,
      }));

      setNewClients(newClientsFormatted);

      setStats({
        totalAmount,
        paidAmount,
        pendingAmount,
        newClientsCount: newClientsFormatted.length,
      });
    } catch (error) {
      console.error('Error loading daily data:', error);
      toast.error('Error al cargar los datos del día');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-500 hover:bg-green-600">Pagado</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500 hover:bg-yellow-600">Pendiente</Badge>;
      case 'overdue':
        return <Badge className="bg-red-500 hover:bg-red-600">Vencido</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="text-gray-600">Cargando reporte diario...</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold text-gray-900">Reporte Diario</h1>
        <p className="text-gray-600 mt-1">Registro de ingresos y nuevos clientes por día</p>
      </div>

      {/* Selector de fecha */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="flex-1 max-w-xs">
              <Label htmlFor="date">Seleccionar Fecha</Label>
              <Input
                id="date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div className="text-sm text-gray-600 pt-6">
              Mostrando datos del{' '}
              {new Date(selectedDate).toLocaleDateString('es-ES', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Estadísticas del día */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Total Facturado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  ${stats.totalAmount.toFixed(2)}
                </div>
                <div className="text-sm text-gray-600">{dailyInvoices.length} facturas</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Total Cobrado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">
                  ${stats.paidAmount.toFixed(2)}
                </div>
                <div className="text-sm text-gray-600">
                  {dailyInvoices.filter((inv) => inv.status === 'paid').length} pagos
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Por Cobrar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-yellow-600">
                  ${stats.pendingAmount.toFixed(2)}
                </div>
                <div className="text-sm text-gray-600">
                  {dailyInvoices.filter((inv) => inv.status !== 'paid').length} pendientes
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Nuevos Clientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">
                  {stats.newClientsCount}
                </div>
                <div className="text-sm text-gray-600">registros</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de facturas del día */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-blue-600" />
            Facturas del Día
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="font-semibold">Hora</TableHead>
                <TableHead className="font-semibold">Cliente</TableHead>
                <TableHead className="font-semibold">Descripción</TableHead>
                <TableHead className="font-semibold text-right">Monto</TableHead>
                <TableHead className="font-semibold">Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dailyInvoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                    No hay facturas registradas en esta fecha
                  </TableCell>
                </TableRow>
              ) : (
                dailyInvoices.map((invoice) => (
                  <TableRow key={invoice.id} className="hover:bg-gray-50">
                    <TableCell className="font-mono text-sm">
                      {formatDate(invoice.createdAt)}
                    </TableCell>
                    <TableCell className="font-medium">{invoice.clientName}</TableCell>
                    <TableCell>{invoice.description}</TableCell>
                    <TableCell className="text-right font-medium">
                      ${invoice.amount.toFixed(2)}
                    </TableCell>
                    <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Tabla de nuevos clientes del día */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-600" />
            Nuevos Clientes del Día
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="font-semibold">Hora</TableHead>
                <TableHead className="font-semibold">Nombre</TableHead>
                <TableHead className="font-semibold">Email</TableHead>
                <TableHead className="font-semibold">Teléfono</TableHead>
                <TableHead className="font-semibold">Plan</TableHead>
                <TableHead className="font-semibold text-right">Mensualidad</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {newClients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                    No hay clientes nuevos registrados en esta fecha
                  </TableCell>
                </TableRow>
              ) : (
                newClients.map((client) => (
                  <TableRow key={client.id} className="hover:bg-gray-50">
                    <TableCell className="font-mono text-sm">
                      {formatDate(client.joinDate)}
                    </TableCell>
                    <TableCell className="font-medium">{client.name}</TableCell>
                    <TableCell>{client.email}</TableCell>
                    <TableCell>{client.phone}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{client.planName}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ${client.monthlyFee.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
