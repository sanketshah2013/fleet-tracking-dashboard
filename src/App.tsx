import { Alert, Box, Divider, Skeleton, Stack } from "@mui/material";
import { useMemo } from "react";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import VehicleDetailModal from "./components/VehicleDetailModal";
import VehicleTable from "./components/VehicleTable";
import { useFleet } from "./context/FleetContext";
import { useFleetData } from "./hooks/useFleetData";
import { Vehicle } from "./types";

export default function App(): JSX.Element {
  useFleetData();

  const {
    vehicles,
    statistics,
    statusFilter,
    setFilter,
    loading,
    error,
    wsStatus,
    lastUpdated,
    selectedVehicleId,
    vehicleDetail,
    vehicleDetailLoading,
    selectVehicle,
    clearSelection,
  } = useFleet();

  const filteredVehicles = useMemo(() => {
    if (statusFilter === "ALL") return vehicles;
    return vehicles.filter((v) => v.status === statusFilter);
  }, [vehicles, statusFilter]);

  const selectedFromList: Vehicle | null =
    vehicles.find((v) => v.id === selectedVehicleId) || null;
  const modalVehicle = vehicleDetail || selectedFromList;

  return (
    <Box sx={{ mx: "auto", p: { xs: 2, md: 2 } }}>
      <Header />
      <Divider sx={{ mb: 2 }} />
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={4}
        alignItems="flex-start"
      >
        <Sidebar
          vehicles={vehicles}
          statistics={statistics}
          wsStatus={wsStatus}
          statusFilter={statusFilter}
          onFilterChange={setFilter}
          lastUpdated={lastUpdated}
        />

        <Box sx={{ flexGrow: 1, width: "100%", minWidth: 0 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              Couldn't load fleet data: {error}
            </Alert>
          )}

          {loading ? (
            <Stack spacing={1}>
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} variant="rounded" height={44} />
              ))}
            </Stack>
          ) : (
            <VehicleTable
              vehicles={filteredVehicles}
              onSelect={selectVehicle}
              loading={loading}
              error={error}
              wsStatus={wsStatus}
            />
          )}
        </Box>
      </Stack>

      <VehicleDetailModal
        open={Boolean(selectedVehicleId)}
        onClose={clearSelection}
        vehicle={modalVehicle}
        loading={vehicleDetailLoading}
      />
    </Box>
  );
}
