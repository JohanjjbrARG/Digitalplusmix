import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import { Icon } from 'leaflet';
import { MapPin, Activity, AlertTriangle, Navigation, Layers } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { clientsAPI } from '@/lib/api';
import { zonesAPI } from '@/lib/api-tickets-zones';

// Configurar iconos personalizados de Leaflet
const createCustomIcon = (color: string) => {
  return new Icon({
    iconUrl: `data:image/svg+xml;base64,${btoa(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}" stroke="white" stroke-width="2">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
        <circle cx="12" cy="10" r="3" fill="white" stroke="${color}"/>
      </svg>
    `)}`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
};

const activeIcon = createCustomIcon('#10b981'); // green
const delinquentIcon = createCustomIcon('#ef4444'); // red
const suspendedIcon = createCustomIcon('#f59e0b'); // orange

interface Client {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  status: 'active' | 'suspended' | 'delinquent';
  planName: string;
  ipAddress: string;
  neighborhood: string;
  connectionStatus: 'online' | 'offline';
}

interface Zone {
  id: string;
  name: string;
  description: string;
  color: string;
  centerLatitude: number;
  centerLongitude: number;
}

// Componente para centrar el mapa automáticamente
function MapCenterUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  
  return null;
}

export function NetworkMap() {
  const [clients, setClients] = useState<Client[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [showZones, setShowZones] = useState(true);
  const [mapCenter, setMapCenter] = useState<[number, number]>([-12.046374, -77.042793]); // Lima, Peru

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [clientsResponse, zonesResponse] = await Promise.all([
        clientsAPI.getAll(),
        zonesAPI.getAll(),
      ]);

      // Filtrar solo clientes con coordenadas
      const clientsWithCoords = (clientsResponse.clients || []).filter(
        (c: any) => c.latitude && c.longitude
      );

      setClients(clientsWithCoords);
      setZones(zonesResponse.zones || []);

      // Si hay clientes, centrar en el primero
      if (clientsWithCoords.length > 0) {
        const firstClient = clientsWithCoords[0];
        setMapCenter([firstClient.latitude, firstClient.longitude]);
      } else if (zonesResponse.zones && zonesResponse.zones.length > 0) {
        const firstZone = zonesResponse.zones[0];
        if (firstZone.centerLatitude && firstZone.centerLongitude) {
          setMapCenter([firstZone.centerLatitude, firstZone.centerLongitude]);
        }
      }
    } catch (error) {
      console.error('Error loading map data:', error);
      toast.error('Error al cargar los datos del mapa');
    } finally {
      setLoading(false);
    }
  };

  const getClientIcon = (status: string) => {
    switch (status) {
      case 'active':
        return activeIcon;
      case 'delinquent':
        return delinquentIcon;
      case 'suspended':
        return suspendedIcon;
      default:
        return activeIcon;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500">Al día</Badge>;
      case 'delinquent':
        return <Badge className="bg-red-500">Moroso</Badge>;
      case 'suspended':
        return <Badge className="bg-yellow-500">Suspendido</Badge>;
    }
  };

  const getConnectionBadge = (status: string) => {
    return status === 'online' ? (
      <Badge className="bg-blue-500">En línea</Badge>
    ) : (
      <Badge variant="outline">Desconectado</Badge>
    );
  };

  const calculateStats = () => {
    return {
      total: clients.length,
      active: clients.filter((c) => c.status === 'active').length,
      delinquent: clients.filter((c) => c.status === 'delinquent').length,
      online: clients.filter((c) => c.connectionStatus === 'online').length,
    };
  };

  const stats = calculateStats();

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="text-gray-600">Cargando mapa...</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900 mb-2">Mapa de Red</h1>
          <p className="text-gray-600">Visualización geográfica de clientes y zonas</p>
        </div>
        <Button
          variant="outline"
          onClick={() => setShowZones(!showZones)}
          className="flex items-center gap-2"
        >
          <Layers className="w-4 h-4" />
          {showZones ? 'Ocultar' : 'Mostrar'} Zonas
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Clientes</CardTitle>
            <MapPin className="w-5 h-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Activos</CardTitle>
            <Activity className="w-5 h-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-green-600">{stats.active}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Morosos</CardTitle>
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-red-600">{stats.delinquent}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">En Línea</CardTitle>
            <Navigation className="w-5 h-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-blue-600">{stats.online}</div>
          </CardContent>
        </Card>
      </div>

      {/* Map */}
      <Card>
        <CardHeader>
          <CardTitle>Mapa Interactivo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg overflow-hidden border border-gray-200" style={{ height: '600px' }}>
            <MapContainer
              center={mapCenter}
              zoom={13}
              style={{ height: '100%', width: '100%' }}
              scrollWheelZoom={true}
            >
              <MapCenterUpdater center={mapCenter} />
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {/* Zonas */}
              {showZones &&
                zones.map((zone) => {
                  if (!zone.centerLatitude || !zone.centerLongitude) return null;
                  return (
                    <Circle
                      key={zone.id}
                      center={[zone.centerLatitude, zone.centerLongitude]}
                      radius={1000}
                      pathOptions={{
                        color: zone.color,
                        fillColor: zone.color,
                        fillOpacity: 0.1,
                        weight: 2,
                      }}
                    >
                      <Popup>
                        <div className="p-2">
                          <h3 className="font-semibold text-lg">{zone.name}</h3>
                          {zone.description && (
                            <p className="text-sm text-gray-600 mt-1">{zone.description}</p>
                          )}
                        </div>
                      </Popup>
                    </Circle>
                  );
                })}

              {/* Clientes */}
              {clients.map((client) => (
                <Marker
                  key={client.id}
                  position={[client.latitude, client.longitude]}
                  icon={getClientIcon(client.status)}
                >
                  <Popup>
                    <div className="p-2 min-w-[200px]">
                      <h3 className="font-semibold text-lg mb-2">{client.name}</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Estado:</span>
                          {getStatusBadge(client.status)}
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Conexión:</span>
                          {getConnectionBadge(client.connectionStatus)}
                        </div>
                        <div>
                          <span className="text-gray-600">Plan:</span>
                          <p className="font-medium">{client.planName}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">IP:</span>
                          <p className="font-mono text-xs">{client.ipAddress}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Barrio:</span>
                          <p className="font-medium">{client.neighborhood}</p>
                        </div>
                        <Button
                          size="sm"
                          className="w-full mt-2 bg-blue-600 hover:bg-blue-700"
                          onClick={() => window.open(`/clients/${client.id}`, '_blank')}
                        >
                          Ver Detalles
                        </Button>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
          
          {clients.length === 0 && (
            <div className="text-center text-gray-500 py-8">
              <MapPin className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p>No hay clientes con coordenadas GPS registradas</p>
              <p className="text-sm mt-2">
                Agrega coordenadas a los clientes para verlos en el mapa
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
