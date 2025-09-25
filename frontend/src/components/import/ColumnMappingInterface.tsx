import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Alert,
  Button,
  Grid,
  Tooltip,
  IconButton,
  LinearProgress
} from '@mui/material';
import {
  CheckCircle,
  Warning,
  Error,
  Info,
  Refresh,
  AutoFixHigh
} from '@mui/icons-material';

interface ColumnMapping {
  sourceColumn: string;
  targetField: string;
  confidence: number;
  required: boolean;
  dataType: string;
  suggestions: string[];
}

interface MappingValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

interface ColumnMappingProps {
  sourceColumns: string[];
  targetFields: TargetField[];
  initialMappings?: ColumnMapping[];
  onMappingChange: (mappings: ColumnMapping[]) => void;
  onValidationChange: (validation: MappingValidation) => void;
  loading?: boolean;
}

interface TargetField {
  name: string;
  label: string;
  required: boolean;
  dataType: string;
  description?: string;
  examples?: string[];
}

export const ColumnMappingInterface: React.FC<ColumnMappingProps> = ({
  sourceColumns,
  targetFields,
  initialMappings = [],
  onMappingChange,
  onValidationChange,
  loading = false
}) => {
  const [mappings, setMappings] = useState<ColumnMapping[]>(initialMappings);
  const [validation, setValidation] = useState<MappingValidation>({
    isValid: false,
    errors: [],
    warnings: []
  });

  useEffect(() => {
    if (sourceColumns.length > 0 && mappings.length === 0) {
      generateAutoMappings();
    }
  }, [sourceColumns]);

  useEffect(() => {
    validateMappings();
  }, [mappings]);

  const generateAutoMappings = () => {
    const autoMappings: ColumnMapping[] = sourceColumns.map(sourceColumn => {
      const suggestions = findMappingSuggestions(sourceColumn);
      const bestMatch = suggestions[0];
      
      return {
        sourceColumn,
        targetField: bestMatch || '',
        confidence: bestMatch ? calculateConfidence(sourceColumn, bestMatch) : 0,
        required: targetFields.find(f => f.name === bestMatch)?.required || false,
        dataType: targetFields.find(f => f.name === bestMatch)?.dataType || 'string',
        suggestions
      };
    });

    setMappings(autoMappings);
    onMappingChange(autoMappings);
  };

  const findMappingSuggestions = (sourceColumn: string): string[] => {
    const normalizedSource = sourceColumn.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    return targetFields
      .map(field => ({
        field: field.name,
        score: calculateSimilarity(normalizedSource, field.name.toLowerCase().replace(/[^a-z0-9]/g, ''))
      }))
      .sort((a, b) => b.score - a.score)
      .filter(item => item.score > 0.3)
      .map(item => item.field);
  };

  const calculateSimilarity = (str1: string, str2: string): number => {
    // Simple Levenshtein distance-based similarity
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }
    
    const distance = matrix[str2.length][str1.length];
    const maxLength = Math.max(str1.length, str2.length);
    return maxLength === 0 ? 1 : 1 - distance / maxLength;
  };

  const calculateConfidence = (sourceColumn: string, targetField: string): number => {
    return Math.round(calculateSimilarity(
      sourceColumn.toLowerCase().replace(/[^a-z0-9]/g, ''),
      targetField.toLowerCase().replace(/[^a-z0-9]/g, '')
    ) * 100);
  };

  const validateMappings = () => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check required fields
    const requiredFields = targetFields.filter(f => f.required);
    const mappedFields = mappings.filter(m => m.targetField).map(m => m.targetField);
    
    requiredFields.forEach(field => {
      if (!mappedFields.includes(field.name)) {
        errors.push(`Required field "${field.label}" is not mapped`);
      }
    });

    // Check duplicate mappings
    const duplicates = mappedFields.filter((field, index) => 
      field && mappedFields.indexOf(field) !== index
    );
    duplicates.forEach(field => {
      const targetField = targetFields.find(f => f.name === field);
      errors.push(`Field "${targetField?.label}" is mapped multiple times`);
    });

    // Check low confidence mappings
    mappings.forEach(mapping => {
      if (mapping.targetField && mapping.confidence < 50) {
        warnings.push(`Low confidence mapping: "${mapping.sourceColumn}" → "${targetFields.find(f => f.name === mapping.targetField)?.label}"`);
      }
    });

    const newValidation = {
      isValid: errors.length === 0,
      errors,
      warnings
    };

    setValidation(newValidation);
    onValidationChange(newValidation);
  };

  const handleMappingChange = (sourceColumn: string, targetField: string) => {
    const updatedMappings = mappings.map(mapping => {
      if (mapping.sourceColumn === sourceColumn) {
        const target = targetFields.find(f => f.name === targetField);
        return {
          ...mapping,
          targetField,
          confidence: targetField ? calculateConfidence(sourceColumn, targetField) : 0,
          required: target?.required || false,
          dataType: target?.dataType || 'string'
        };
      }
      return mapping;
    });

    setMappings(updatedMappings);
    onMappingChange(updatedMappings);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'success';
    if (confidence >= 60) return 'warning';
    return 'error';
  };

  const getConfidenceIcon = (confidence: number) => {
    if (confidence >= 80) return <CheckCircle />;
    if (confidence >= 60) return <Warning />;
    return <Error />;
  };

  if (loading) {
    return (
      <Box>
        <Typography variant="h6" gutterBottom>
          Analyzing columns...
        </Typography>
        <LinearProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">
          Column Mapping
        </Typography>
        <Box>
          <Button
            startIcon={<AutoFixHigh />}
            onClick={generateAutoMappings}
            variant="outlined"
            sx={{ mr: 1 }}
          >
            Auto-map
          </Button>
          <Button
            startIcon={<Refresh />}
            onClick={() => {
              setMappings([]);
              generateAutoMappings();
            }}
            variant="outlined"
          >
            Reset
          </Button>
        </Box>
      </Box>

      {validation.errors.length > 0 && (
        <Alert severity="error" sx={{ mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Mapping Errors:
          </Typography>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {validation.errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </Alert>
      )}

      {validation.warnings.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Mapping Warnings:
          </Typography>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {validation.warnings.map((warning, index) => (
              <li key={index}>{warning}</li>
            ))}
          </ul>
        </Alert>
      )}

      <Grid container spacing={2}>
        {mappings.map((mapping, index) => {
          const targetField = targetFields.find(f => f.name === mapping.targetField);
          
          return (
            <Grid item xs={12} key={mapping.sourceColumn}>
              <Card variant="outlined">
                <CardContent>
                  <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} sm={4}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Source Column
                      </Typography>
                      <Typography variant="body1" fontWeight="medium">
                        {mapping.sourceColumn}
                      </Typography>
                    </Grid>
                    
                    <Grid item xs={12} sm={1} textAlign="center">
                      <Typography variant="h6" color="text.secondary">
                        →
                      </Typography>
                    </Grid>
                    
                    <Grid item xs={12} sm={5}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Target Field</InputLabel>
                        <Select
                          value={mapping.targetField}
                          label="Target Field"
                          onChange={(e) => handleMappingChange(mapping.sourceColumn, e.target.value)}
                        >
                          <MenuItem value="">
                            <em>Not mapped</em>
                          </MenuItem>
                          {targetFields.map(field => (
                            <MenuItem key={field.name} value={field.name}>
                              <Box display="flex" alignItems="center" width="100%">
                                <Typography>{field.label}</Typography>
                                {field.required && (
                                  <Chip 
                                    label="Required" 
                                    size="small" 
                                    color="error" 
                                    sx={{ ml: 1 }}
                                  />
                                )}
                              </Box>
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      
                      {targetField?.description && (
                        <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                          {targetField.description}
                        </Typography>
                      )}
                    </Grid>
                    
                    <Grid item xs={12} sm={2} textAlign="center">
                      {mapping.targetField && (
                        <Tooltip title={`Confidence: ${mapping.confidence}%`}>
                          <Chip
                            icon={getConfidenceIcon(mapping.confidence)}
                            label={`${mapping.confidence}%`}
                            color={getConfidenceColor(mapping.confidence)}
                            size="small"
                          />
                        </Tooltip>
                      )}
                    </Grid>
                  </Grid>
                  
                  {mapping.suggestions.length > 1 && (
                    <Box mt={2}>
                      <Typography variant="caption" color="text.secondary">
                        Suggestions:
                      </Typography>
                      <Box display="flex" flexWrap="wrap" gap={1} mt={1}>
                        {mapping.suggestions.slice(1, 4).map(suggestion => {
                          const field = targetFields.find(f => f.name === suggestion);
                          return (
                            <Chip
                              key={suggestion}
                              label={field?.label}
                              size="small"
                              variant="outlined"
                              onClick={() => handleMappingChange(mapping.sourceColumn, suggestion)}
                              clickable
                            />
                          );
                        })}
                      </Box>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      <Box mt={3}>
        <Alert severity="info" icon={<Info />}>
          <Typography variant="body2">
            Map your source columns to the appropriate target fields. Required fields must be mapped for the import to proceed.
            Click on suggestion chips to quickly apply alternative mappings.
          </Typography>
        </Alert>
      </Box>
    </Box>
  );
};