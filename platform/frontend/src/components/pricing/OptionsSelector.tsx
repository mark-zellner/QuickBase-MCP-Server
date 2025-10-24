import React, { useState, useMemo } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Typography,
  Checkbox,
  FormControlLabel,
  Chip,
  Tabs,
  Tab,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Badge
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CheckIcon,
  RadioButtonUnchecked as UncheckedIcon,
  Star as RequiredIcon
} from '@mui/icons-material';
import type { Vehicle, VehicleOption } from '../../types';

interface OptionsSelectorProps {
  vehicle: Vehicle;
  availableOptions: VehicleOption[];
  selectedOptions: string[];
  onOptionsChange: (optionIds: string[]) => void;
  disabled?: boolean;
}

export const OptionsSelector: React.FC<OptionsSelectorProps> = ({
  vehicle,
  availableOptions,
  selectedOptions,
  onOptionsChange,
  disabled = false
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Group options by category
  const optionsByCategory = useMemo(() => {
    const grouped = availableOptions.reduce((acc, option) => {
      if (!acc[option.category]) {
        acc[option.category] = [];
      }
      acc[option.category].push(option);
      return acc;
    }, {} as Record<string, VehicleOption[]>);

    // Sort options within each category by name
    Object.keys(grouped).forEach(category => {
      grouped[category].sort((a, b) => a.name.localeCompare(b.name));
    });

    return grouped;
  }, [availableOptions]);

  const categories = Object.keys(optionsByCategory).sort();
  const filteredOptions = selectedCategory === 'all' 
    ? availableOptions 
    : optionsByCategory[selectedCategory] || [];

  // Calculate totals
  const selectedOptionsData = availableOptions.filter(opt => selectedOptions.includes(opt.id));
  const totalOptionsPrice = selectedOptionsData.reduce((sum, opt) => sum + opt.price, 0);
  const requiredOptions = availableOptions.filter(opt => opt.isRequired);
  const requiredOptionsSelected = requiredOptions.filter(opt => selectedOptions.includes(opt.id));

  const handleOptionToggle = (optionId: string) => {
    if (disabled) return;

    const option = availableOptions.find(opt => opt.id === optionId);
    if (!option?.isAvailable) return;

    const newSelected = selectedOptions.includes(optionId)
      ? selectedOptions.filter(id => id !== optionId)
      : [...selectedOptions, optionId];

    onOptionsChange(newSelected);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price);
  };

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      exterior: '🚗',
      interior: '🪑',
      technology: '📱',
      safety: '🛡️',
      performance: '⚡',
      convenience: '🔧'
    };
    return icons[category] || '📦';
  };

  const renderOptionCard = (option: VehicleOption) => {
    const isSelected = selectedOptions.includes(option.id);
    const isCompatible = option.compatibleTrims.length === 0 || 
                        option.compatibleTrims.includes(vehicle.trim);

    return (
      <Grid item xs={12} sm={6} md={4} key={option.id}>
        <Card 
          sx={{ 
            height: '100%',
            cursor: disabled || !option.isAvailable || !isCompatible ? 'default' : 'pointer',
            border: isSelected ? 2 : 1,
            borderColor: isSelected ? 'primary.main' : 'divider',
            opacity: !option.isAvailable || !isCompatible ? 0.6 : 1,
            '&:hover': disabled || !option.isAvailable || !isCompatible ? {} : {
              boxShadow: 3,
              transform: 'translateY(-2px)',
              transition: 'all 0.2s ease-in-out'
            }
          }}
          onClick={() => isCompatible && handleOptionToggle(option.id)}
        >
          <Box sx={{ position: 'relative' }}>
            {option.imageUrl && (
              <CardMedia
                component="img"
                height="120"
                image={option.imageUrl}
                alt={option.name}
                sx={{ objectFit: 'cover' }}
              />
            )}
            
            {option.isRequired && (
              <Badge
                badgeContent={<RequiredIcon sx={{ fontSize: 14 }} />}
                color="error"
                sx={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  '& .MuiBadge-badge': {
                    backgroundColor: 'error.main',
                    color: 'white'
                  }
                }}
              />
            )}
          </Box>
          
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 1 }}>
              <Checkbox
                checked={isSelected}
                disabled={disabled || !option.isAvailable || !isCompatible}
                icon={<UncheckedIcon />}
                checkedIcon={<CheckIcon />}
                sx={{ p: 0, mr: 1 }}
              />
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle1" component="h4">
                  {option.name}
                  {option.isRequired && (
                    <Chip 
                      label="Required" 
                      size="small" 
                      color="error" 
                      sx={{ ml: 1 }} 
                    />
                  )}
                </Typography>
                
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  {option.description}
                </Typography>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Chip 
                    label={`${getCategoryIcon(option.category)} ${option.category}`}
                    size="small"
                    variant="outlined"
                  />
                  <Typography variant="h6" color="primary">
                    {option.price === 0 ? 'Included' : `+${formatPrice(option.price)}`}
                  </Typography>
                </Box>

                {!isCompatible && (
                  <Alert severity="warning" sx={{ mt: 1 }}>
                    Not compatible with {vehicle.trim} trim
                  </Alert>
                )}

                {!option.isAvailable && (
                  <Alert severity="error" sx={{ mt: 1 }}>
                    Currently unavailable
                  </Alert>
                )}
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>
    );
  };

  const renderSummary = () => (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Options Summary
        </Typography>
        
        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}>
            <Typography variant="body2" color="text.secondary">
              Selected Options
            </Typography>
            <Typography variant="h6">
              {selectedOptionsData.length}
            </Typography>
          </Grid>
          
          <Grid item xs={12} sm={4}>
            <Typography variant="body2" color="text.secondary">
              Total Options Price
            </Typography>
            <Typography variant="h6" color="primary">
              {formatPrice(totalOptionsPrice)}
            </Typography>
          </Grid>
          
          <Grid item xs={12} sm={4}>
            <Typography variant="body2" color="text.secondary">
              Required Options
            </Typography>
            <Typography variant="h6" color={requiredOptionsSelected.length === requiredOptions.length ? 'success.main' : 'error.main'}>
              {requiredOptionsSelected.length} / {requiredOptions.length}
            </Typography>
          </Grid>
        </Grid>

        {selectedOptionsData.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Selected Options:
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {selectedOptionsData.map(option => (
                <Chip
                  key={option.id}
                  label={`${option.name} (+${formatPrice(option.price)})`}
                  size="small"
                  onDelete={disabled ? undefined : () => handleOptionToggle(option.id)}
                  color="primary"
                  variant="outlined"
                />
              ))}
            </Box>
          </Box>
        )}

        {requiredOptions.length > requiredOptionsSelected.length && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            Please select all required options before proceeding.
          </Alert>
        )}
      </CardContent>
    </Card>
  );

  return (
    <Box>
      {renderSummary()}

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Available Options for {vehicle.year} {vehicle.make} {vehicle.model} {vehicle.trim}
          </Typography>

          <Tabs
            value={selectedCategory}
            onChange={(_, newValue) => setSelectedCategory(newValue)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ mb: 3 }}
          >
            <Tab label="All Categories" value="all" />
            {categories.map(category => (
              <Tab 
                key={category}
                label={`${getCategoryIcon(category)} ${category.charAt(0).toUpperCase() + category.slice(1)}`}
                value={category}
              />
            ))}
          </Tabs>

          {filteredOptions.length === 0 ? (
            <Alert severity="info">
              No options available in this category.
            </Alert>
          ) : (
            <Grid container spacing={2}>
              {filteredOptions.map(renderOptionCard)}
            </Grid>
          )}

          {selectedCategory === 'all' && categories.length > 1 && (
            <Box sx={{ mt: 4 }}>
              <Typography variant="h6" gutterBottom>
                Options by Category
              </Typography>
              {categories.map(category => (
                <Accordion key={category}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography>
                      {getCategoryIcon(category)} {category.charAt(0).toUpperCase() + category.slice(1)} 
                      ({optionsByCategory[category].length} options)
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <List dense>
                      {optionsByCategory[category].map(option => {
                        const isSelected = selectedOptions.includes(option.id);
                        return (
                          <ListItem 
                            key={option.id}
                            button
                            onClick={() => handleOptionToggle(option.id)}
                            disabled={disabled || !option.isAvailable}
                          >
                            <ListItemIcon>
                              <Checkbox
                                checked={isSelected}
                                disabled={disabled || !option.isAvailable}
                                tabIndex={-1}
                              />
                            </ListItemIcon>
                            <ListItemText
                              primary={option.name}
                              secondary={`${option.description} - ${formatPrice(option.price)}`}
                            />
                          </ListItem>
                        );
                      })}
                    </List>
                  </AccordionDetails>
                </Accordion>
              ))}
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};