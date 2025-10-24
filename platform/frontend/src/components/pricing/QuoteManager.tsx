import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Alert,
  Snackbar,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Avatar,
  Tooltip
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Send as SendIcon,
  Share as ShareIcon,
  Print as PrintIcon,
  MoreVert as MoreIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  CalendarToday as DateIcon,
  AttachMoney as PriceIcon,
  CheckCircle as AcceptedIcon,
  Schedule as PendingIcon,
  Cancel as ExpiredIcon
} from '@mui/icons-material';
import { pricingService } from '../../services';
import type { Quote, PricingConfiguration, PriceBreakdown, FinancingOption } from '../../types';

interface QuoteManagerProps {
  vehicleId?: string;
  configuration?: PricingConfiguration;
  priceBreakdown?: PriceBreakdown;
  selectedFinancing?: FinancingOption;
  onQuoteCreated?: (quote: Quote) => void;
}

export const QuoteManager: React.FC<QuoteManagerProps> = ({
  vehicleId,
  configuration,
  priceBreakdown,
  selectedFinancing,
  onQuoteCreated
}) => {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  
  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  
  // Menu state
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [menuQuote, setMenuQuote] = useState<Quote | null>(null);
  
  // Form state
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    email: '',
    phone: '',
    notes: ''
  });

  useEffect(() => {
    if (vehicleId) {
      loadQuotes();
    }
  }, [vehicleId]);

  const loadQuotes = async () => {
    if (!vehicleId) return;
    
    setLoading(true);
    try {
      // In a real implementation, this would filter by vehicle ID
      // For now, we'll simulate loading quotes
      const mockQuotes: Quote[] = [];
      setQuotes(mockQuotes);
    } catch (err) {
      setError('Failed to load quotes');
      console.error('Error loading quotes:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateQuote = async () => {
    if (!configuration || !priceBreakdown) {
      setError('Missing pricing configuration or breakdown');
      return;
    }

    setLoading(true);
    try {
      const quote: Omit<Quote, 'id' | 'createdAt' | 'updatedAt'> = {
        customerId: undefined,
        customerName: customerInfo.name,
        customerEmail: customerInfo.email,
        customerPhone: customerInfo.phone,
        salesPersonId: 'current-user-id', // Would come from auth context
        vehicleId: configuration.vehicleId,
        configuration,
        priceBreakdown,
        selectedFinancing,
        status: 'draft',
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        notes: customerInfo.notes
      };

      const savedQuote = await pricingService.createQuote(quote);
      setQuotes(prev => [savedQuote, ...prev]);
      setSuccessMessage(`Quote #${savedQuote.id} created successfully!`);
      setCreateDialogOpen(false);
      resetForm();
      
      if (onQuoteCreated) {
        onQuoteCreated(savedQuote);
      }
    } catch (err) {
      setError('Failed to create quote');
      console.error('Error creating quote:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateQuote = async () => {
    if (!selectedQuote) return;

    setLoading(true);
    try {
      const updates = {
        customerName: customerInfo.name,
        customerEmail: customerInfo.email,
        customerPhone: customerInfo.phone,
        notes: customerInfo.notes
      };

      const updatedQuote = await pricingService.updateQuote(selectedQuote.id, updates);
      setQuotes(prev => prev.map(q => q.id === updatedQuote.id ? updatedQuote : q));
      setSuccessMessage(`Quote #${updatedQuote.id} updated successfully!`);
      setEditDialogOpen(false);
      resetForm();
    } catch (err) {
      setError('Failed to update quote');
      console.error('Error updating quote:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendQuote = async (quote: Quote) => {
    setLoading(true);
    try {
      await pricingService.sendQuote(quote.id, quote.customerEmail);
      
      // Update quote status
      const updatedQuote = await pricingService.updateQuote(quote.id, { status: 'sent' });
      setQuotes(prev => prev.map(q => q.id === updatedQuote.id ? updatedQuote : q));
      
      setSuccessMessage(`Quote sent to ${quote.customerEmail} successfully!`);
    } catch (err) {
      setError('Failed to send quote');
      console.error('Error sending quote:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteQuote = async (quoteId: string) => {
    if (!confirm('Are you sure you want to delete this quote?')) return;

    setLoading(true);
    try {
      // In a real implementation, there would be a delete endpoint
      setQuotes(prev => prev.filter(q => q.id !== quoteId));
      setSuccessMessage('Quote deleted successfully!');
    } catch (err) {
      setError('Failed to delete quote');
      console.error('Error deleting quote:', err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setCustomerInfo({ name: '', email: '', phone: '', notes: '' });
    setSelectedQuote(null);
  };

  const openEditDialog = (quote: Quote) => {
    setSelectedQuote(quote);
    setCustomerInfo({
      name: quote.customerName,
      email: quote.customerEmail,
      phone: quote.customerPhone || '',
      notes: quote.notes || ''
    });
    setEditDialogOpen(true);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price);
  };

  const getStatusColor = (status: Quote['status']) => {
    switch (status) {
      case 'draft': return 'default';
      case 'sent': return 'primary';
      case 'viewed': return 'info';
      case 'accepted': return 'success';
      case 'expired': return 'error';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: Quote['status']) => {
    switch (status) {
      case 'accepted': return <AcceptedIcon />;
      case 'expired': return <ExpiredIcon />;
      default: return <PendingIcon />;
    }
  };

  const renderQuoteDialog = (isEdit: boolean) => (
    <Dialog 
      open={isEdit ? editDialogOpen : createDialogOpen}
      onClose={() => isEdit ? setEditDialogOpen(false) : setCreateDialogOpen(false)}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        {isEdit ? 'Edit Quote' : 'Create New Quote'}
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Customer Name"
              value={customerInfo.name}
              onChange={(e) => setCustomerInfo(prev => ({ ...prev, name: e.target.value }))}
              required
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Email Address"
              type="email"
              value={customerInfo.email}
              onChange={(e) => setCustomerInfo(prev => ({ ...prev, email: e.target.value }))}
              required
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Phone Number"
              value={customerInfo.phone}
              onChange={(e) => setCustomerInfo(prev => ({ ...prev, phone: e.target.value }))}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Notes"
              multiline
              rows={3}
              value={customerInfo.notes}
              onChange={(e) => setCustomerInfo(prev => ({ ...prev, notes: e.target.value }))}
            />
          </Grid>
        </Grid>

        {priceBreakdown && !isEdit && (
          <Alert severity="info" sx={{ mt: 2 }}>
            Total Price: {formatPrice(priceBreakdown.totalPrice)}
            {selectedFinancing && (
              <Typography variant="body2">
                Monthly Payment: {formatPrice(selectedFinancing.monthlyPayment)} 
                ({selectedFinancing.termMonths} months)
              </Typography>
            )}
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button 
          onClick={() => isEdit ? setEditDialogOpen(false) : setCreateDialogOpen(false)}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button 
          onClick={isEdit ? handleUpdateQuote : handleCreateQuote}
          disabled={loading || !customerInfo.name || !customerInfo.email}
          variant="contained"
        >
          {isEdit ? 'Update' : 'Create'} Quote
        </Button>
      </DialogActions>
    </Dialog>
  );

  return (
    <Box>
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6">
              Quote Management
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setCreateDialogOpen(true)}
              disabled={!configuration || !priceBreakdown}
            >
              Create Quote
            </Button>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {quotes.length === 0 ? (
            <Alert severity="info">
              No quotes created yet. Configure a vehicle and pricing to create your first quote.
            </Alert>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Quote ID</TableCell>
                    <TableCell>Customer</TableCell>
                    <TableCell>Total Price</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Created</TableCell>
                    <TableCell>Valid Until</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {quotes.map((quote) => (
                    <TableRow key={quote.id}>
                      <TableCell>
                        <Typography variant="subtitle2">#{quote.id}</Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar sx={{ width: 32, height: 32 }}>
                            <PersonIcon />
                          </Avatar>
                          <Box>
                            <Typography variant="subtitle2">{quote.customerName}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {quote.customerEmail}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="h6" color="primary">
                          {formatPrice(quote.priceBreakdown.totalPrice)}
                        </Typography>
                        {quote.selectedFinancing && (
                          <Typography variant="caption" color="text.secondary">
                            {formatPrice(quote.selectedFinancing.monthlyPayment)}/mo
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          icon={getStatusIcon(quote.status)}
                          label={quote.status.toUpperCase()}
                          color={getStatusColor(quote.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {new Date(quote.createdAt).toLocaleDateString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color={
                          new Date(quote.validUntil) < new Date() ? 'error.main' : 'text.primary'
                        }>
                          {new Date(quote.validUntil).toLocaleDateString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <Tooltip title="Send Quote">
                            <IconButton
                              size="small"
                              onClick={() => handleSendQuote(quote)}
                              disabled={loading || quote.status === 'sent'}
                            >
                              <SendIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Edit Quote">
                            <IconButton
                              size="small"
                              onClick={() => openEditDialog(quote)}
                              disabled={loading}
                            >
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              setAnchorEl(e.currentTarget);
                              setMenuQuote(quote);
                            }}
                          >
                            <MoreIcon />
                          </IconButton>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* Action Menu */}
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={() => setAnchorEl(null)}
          >
            <MenuItem onClick={() => {
              if (menuQuote) {
                // Implement share functionality
                navigator.clipboard.writeText(`Quote #${menuQuote.id}: ${formatPrice(menuQuote.priceBreakdown.totalPrice)}`);
                setSuccessMessage('Quote link copied to clipboard!');
              }
              setAnchorEl(null);
            }}>
              <ShareIcon sx={{ mr: 1 }} />
              Share Quote
            </MenuItem>
            <MenuItem onClick={() => {
              if (menuQuote) {
                // Implement print functionality
                window.print();
              }
              setAnchorEl(null);
            }}>
              <PrintIcon sx={{ mr: 1 }} />
              Print Quote
            </MenuItem>
            <Divider />
            <MenuItem 
              onClick={() => {
                if (menuQuote) {
                  handleDeleteQuote(menuQuote.id);
                }
                setAnchorEl(null);
              }}
              sx={{ color: 'error.main' }}
            >
              <DeleteIcon sx={{ mr: 1 }} />
              Delete Quote
            </MenuItem>
          </Menu>
        </CardContent>
      </Card>

      {/* Dialogs */}
      {renderQuoteDialog(false)}
      {renderQuoteDialog(true)}

      {/* Success/Error Snackbar */}
      <Snackbar
        open={!!successMessage}
        autoHideDuration={6000}
        onClose={() => setSuccessMessage('')}
      >
        <Alert 
          onClose={() => setSuccessMessage('')} 
          severity={successMessage.includes('Failed') ? 'error' : 'success'}
        >
          {successMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};