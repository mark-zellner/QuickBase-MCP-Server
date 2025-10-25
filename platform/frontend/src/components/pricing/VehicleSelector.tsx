import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Button,
  Pagination,
  Alert,
  Skeleton,
  Badge,
  Tooltip
} from '@mui/material';
import {
  Search as SearchIcon,
  LocalGasStation as FuelIcon,
  Speed as EngineIcon,
  DriveEta as DrivetrainIcon,
  CheckCircle as AvailableIcon
} from '@mui/icons-material';
import { pricingService } from '../../services';
import type { Vehicle, VehicleSearchFilters } from '../../types';

interface VehicleSelectorProps {
  onVehicleSelect: (vehicle: Vehicle) => void;
  selectedVehicle?: Vehicle | null;
  disabled?: boolean;
}

export const VehicleSelector: React.FC<VehicleSelectorProps> = ({
  onVehicleSelect,
  selectedVehicle,
  disabled = false
}) => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [filters, setFilters] = useState<VehicleSearchFilters>({
    availableOnly: true
  });

  const itemsPerPage = 12;

  // Get unique filter options from vehicles
  const filterOptions = useMemo(() => {
    const makes = [...new Set(vehicles.map(v => v.make))].sort();
    const models = [...new Set(vehicles.map(v => v.model))].sort();
    const years = [...new Set(vehicles.map(v => v.year))].sort((a, b) => b - a);
    const fuelTypes = [...new Set(vehicles.map(v => v.fuelType))].sort();
    const drivetrains = [...new Set(vehicles.map(v => v.drivetrain))].sort();
    
    return { makes, models, years, fuelTypes, drivetrains };
  }, [vehicles]);

  useEffect(() => {
    searchVehicles();
  }, [filters, page]);

  const searchVehicles = async () => {
    setLoading(true);
    setError(null);

    try {
      const [vehicleResults, count] = await Promise.all([
        pricingService.searchVehicles({
          ...filters,
          // Add pagination - this would need to be implemented in the service
        }),
        pricingService.getInventoryCount(filters)
      ]);

      setVehicles(vehicleResults);
      setTotalCount(count);
    } catch (err) {
      setError('Failed to load vehicle inventory');
      console.error('Error searching vehicles:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field: keyof VehicleSearchFilters, value: any) => {
    setFilters((prev: VehicleSearchFilters) => ({
      ...prev,
      [field]: value || undefined
    }));
    setPage(1); // Reset to first page when filters change
  };

  const clearFilters = () => {
    setFilters({ availableOnly: true });
    setPage(1);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price);
  };

  const renderVehicleCard = (vehicle: Vehicle) => (
    <Grid item xs={12} sm={6} md={4} key={vehicle.id}>
      <Card 
        sx={{ 
          height: '100%',
          cursor: disabled ? 'default' : 'pointer',
          border: selectedVehicle?.id === vehicle.id ? 2 : 1,
          borderColor: selectedVehicle?.id === vehicle.id ? 'primary.main' : 'divider',
          '&:hover': disabled ? {} : {
            boxShadow: 3,
            transform: 'translateY(-2px)',
            transition: 'all 0.2s ease-in-out'
          }
        }}
        onClick={() => !disabled && onVehicleSelect(vehicle)}
      >
        <Box sx={{ position: 'relative' }}>
          <CardMedia
            component="img"
            height="200"
            image={vehicle.images[0] || '/placeholder-car.jpg'}
            alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
            sx={{ objectFit: 'cover' }}
          />
          {vehicle.isAvailable && (
            <Badge
              badgeContent={<AvailableIcon sx={{ fontSize: 16 }} />}
              color="success"
              sx={{
                position: 'absolute',
                top: 8,
                right: 8,
                '& .MuiBadge-badge': {
                  backgroundColor: 'success.main',
                  color: 'white'
                }
              }}
            />
          )}
        </Box>
        
        <CardContent>
          <Typography variant="h6" component="h3" gutterBottom>
            {vehicle.year} {vehicle.make} {vehicle.model}
          </Typography>
          
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            {vehicle.trim}
          </Typography>

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
            <Chip 
              icon={<FuelIcon />}
              label={vehicle.fuelType}
              size="small"
              variant="outlined"
            />
            <Chip 
              icon={<DrivetrainIcon />}
              label={vehicle.drivetrain}
              size="small"
              variant="outlined"
            />
            {vehicle.mpgCity && vehicle.mpgHighway && (
              <Chip 
                label={`${vehicle.mpgCity}/${vehicle.mpgHighway} MPG`}
                size="small"
                variant="outlined"
              />
            )}
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              MSRP
            </Typography>
            <Typography variant="h6" color="primary">
              {formatPrice(vehicle.msrp)}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Stock #{vehicle.stockNumber}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {vehicle.location}
            </Typography>
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {vehicle.exteriorColor} / {vehicle.interiorColor}
          </Typography>

          {selectedVehicle?.id === vehicle.id && (
            <Chip 
              label="Selected"
              color="primary"
              size="small"
              sx={{ mt: 1 }}
            />
          )}
        </CardContent>
      </Card>
    </Grid>
  );

  const renderFilters = () => (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Search Filters
        </Typography>
        
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <InputLabel>Make</InputLabel>
              <Select
                value={filters.make || ''}
                label="Make"
                onChange={(e) => handleFilterChange('make', e.target.value)}
              >
                <MenuItem value="">All Makes</MenuItem>
                {filterOptions.makes.map(make => (
                  <MenuItem key={make} value={make}>{make}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <InputLabel>Model</InputLabel>
              <Select
                value={filters.model || ''}
                label="Model"
                onChange={(e) => handleFilterChange('model', e.target.value)}
                disabled={!filters.make}
              >
                <MenuItem value="">All Models</MenuItem>
                {filterOptions.models.map(model => (
                  <MenuItem key={model} value={model}>{model}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth>
              <InputLabel>Year</InputLabel>
              <Select
                value={filters.yearMin || ''}
                label="Year"
                onChange={(e) => handleFilterChange('yearMin', e.target.value)}
              >
                <MenuItem value="">All Years</MenuItem>
                {filterOptions.years.map(year => (
                  <MenuItem key={year} value={year}>{year}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={2}>
            <TextField
              fullWidth
              label="Min Price"
              type="number"
              value={filters.priceMin || ''}
              onChange={(e) => handleFilterChange('priceMin', parseInt(e.target.value) || undefined)}
              InputProps={{
                startAdornment: '$'
              }}
            />
          </Grid>

          <Grid item xs={12} sm={6} md={2}>
            <TextField
              fullWidth
              label="Max Price"
              type="number"
              value={filters.priceMax || ''}
              onChange={(e) => handleFilterChange('priceMax', parseInt(e.target.value) || undefined)}
              InputProps={{
                startAdornment: '$'
              }}
            />
          </Grid>

          <Grid item xs={12}>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Button
                variant="outlined"
                onClick={searchVehicles}
                startIcon={<SearchIcon />}
                disabled={loading}
              >
                Search
              </Button>
              <Button
                variant="text"
                onClick={clearFilters}
                disabled={loading}
              >
                Clear Filters
              </Button>
            </Box>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );

  return (
    <Box>
      {renderFilters()}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">
          Available Vehicles ({totalCount})
        </Typography>
        {selectedVehicle && (
          <Chip 
            label={`Selected: ${selectedVehicle.year} ${selectedVehicle.make} ${selectedVehicle.model}`}
            color="primary"
            onDelete={disabled ? undefined : () => onVehicleSelect(null as any)}
          />
        )}
      </Box>

      {loading ? (
        <Grid container spacing={2}>
          {Array.from({ length: 6 }).map((_, index) => (
            <Grid item xs={12} sm={6} md={4} key={index}>
              <Card>
                <Skeleton variant="rectangular" height={200} />
                <CardContent>
                  <Skeleton variant="text" height={32} />
                  <Skeleton variant="text" height={24} />
                  <Skeleton variant="text" height={20} />
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : (
        <>
          <Grid container spacing={2}>
            {vehicles.map(renderVehicleCard)}
          </Grid>

          {vehicles.length === 0 && !loading && (
            <Alert severity="info" sx={{ mt: 2 }}>
              No vehicles found matching your criteria. Try adjusting your filters.
            </Alert>
          )}

          {totalCount > itemsPerPage && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
              <Pagination
                count={Math.ceil(totalCount / itemsPerPage)}
                page={page}
                onChange={(_, newPage) => setPage(newPage)}
                color="primary"
              />
            </Box>
          )}
        </>
      )}
    </Box>
  );
};