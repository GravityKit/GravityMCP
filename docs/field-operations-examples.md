# Field Operations Examples

This document provides practical examples for common field operations use cases.

## Table of Contents

- [Basic Operations](#basic-operations)
- [Contact Forms](#contact-forms)
- [E-commerce Forms](#e-commerce-forms)
- [Multi-page Forms](#multi-page-forms)
- [Conditional Logic](#conditional-logic)
- [Advanced Scenarios](#advanced-scenarios)

## Basic Operations

### Adding Simple Fields

**Add a basic text field:**
```javascript
const result = await mcp_call('gf_add_field', {
  form_id: 1,
  field_type: 'text',
  properties: {
    label: 'Full Name',
    isRequired: true,
    placeholder: 'Enter your full name'
  }
});

console.log(`Added field ID: ${result.field.id}`);
```

**Add an email field with confirmation:**
```javascript
await mcp_call('gf_add_field', {
  form_id: 1,
  field_type: 'email',
  properties: {
    label: 'Email Address',
    isRequired: true,
    emailConfirmEnabled: true,
    placeholder: 'your@email.com'
  }
});
```

**Add a dropdown with choices:**
```javascript
await mcp_call('gf_add_field', {
  form_id: 1,
  field_type: 'select',
  properties: {
    label: 'How did you hear about us?',
    choices: [
      { text: 'Google Search', value: 'google' },
      { text: 'Social Media', value: 'social' },
      { text: 'Friend Referral', value: 'referral' },
      { text: 'Advertisement', value: 'ad' },
      { text: 'Other', value: 'other' }
    ],
    defaultValue: 'google'
  }
});
```

### Updating Existing Fields

**Update field label and add description:**
```javascript
await mcp_call('gf_update_field', {
  form_id: 1,
  field_id: 3,
  properties: {
    label: 'Business Email Address',
    description: 'We will use this to send you important updates',
    placeholder: 'name@company.com'
  }
});
```

**Make field required:**
```javascript
await mcp_call('gf_update_field', {
  form_id: 1,
  field_id: 5,
  properties: {
    isRequired: true,
    requiredMessage: 'This field is required for processing your request'
  }
});
```

### Deleting Fields

**Safe deletion (warns about dependencies):**
```javascript
const result = await mcp_call('gf_delete_field', {
  form_id: 1,
  field_id: 7,
  force: false
});

if (!result.success) {
  console.log('Deletion blocked due to dependencies:');
  console.log(result.dependencies);
}
```

**Force deletion with cleanup:**
```javascript
await mcp_call('gf_delete_field', {
  form_id: 1,
  field_id: 7,
  force: true,
  cascade: true  // Automatically clean up dependencies
});
```

## Contact Forms

### Building a Complete Contact Form

```javascript
// 1. Start with basic contact info
await mcp_call('gf_add_field', {
  form_id: 2,
  field_type: 'name',
  properties: {
    label: 'Full Name',
    nameFormat: 'advanced',
    isRequired: true
  }
});

// 2. Add email with confirmation
await mcp_call('gf_add_field', {
  form_id: 2,
  field_type: 'email',
  properties: {
    label: 'Email Address',
    isRequired: true,
    emailConfirmEnabled: true
  }
});

// 3. Add phone number
await mcp_call('gf_add_field', {
  form_id: 2,
  field_type: 'phone',
  properties: {
    label: 'Phone Number',
    phoneFormat: 'standard',
    isRequired: false
  }
});

// 4. Add company information
await mcp_call('gf_add_field', {
  form_id: 2,
  field_type: 'text',
  properties: {
    label: 'Company Name',
    placeholder: 'Your company or organization'
  }
});

// 5. Add subject dropdown
await mcp_call('gf_add_field', {
  form_id: 2,
  field_type: 'select',
  properties: {
    label: 'Subject',
    choices: [
      { text: 'General Inquiry', value: 'general' },
      { text: 'Sales Question', value: 'sales' },
      { text: 'Technical Support', value: 'support' },
      { text: 'Partnership', value: 'partnership' }
    ]
  }
});

// 6. Add message area
await mcp_call('gf_add_field', {
  form_id: 2,
  field_type: 'textarea',
  properties: {
    label: 'Message',
    placeholder: 'Please describe your inquiry in detail...',
    rows: 6,
    isRequired: true
  }
});
```

### Adding Contact Preferences

```javascript
// Add communication preferences
await mcp_call('gf_add_field', {
  form_id: 2,
  field_type: 'checkbox',
  properties: {
    label: 'Communication Preferences',
    choices: [
      { text: 'Email updates', value: 'email_updates' },
      { text: 'Newsletter subscription', value: 'newsletter' },
      { text: 'Product announcements', value: 'announcements' },
      { text: 'Event invitations', value: 'events' }
    ]
  }
});

// Add preferred contact time
await mcp_call('gf_add_field', {
  form_id: 2,
  field_type: 'radio',
  properties: {
    label: 'Best time to contact you',
    choices: [
      { text: 'Morning (9 AM - 12 PM)', value: 'morning' },
      { text: 'Afternoon (12 PM - 5 PM)', value: 'afternoon' },
      { text: 'Evening (5 PM - 8 PM)', value: 'evening' }
    ]
  }
});
```

## E-commerce Forms

### Product Order Form

```javascript
// 1. Customer information
await mcp_call('gf_add_field', {
  form_id: 3,
  field_type: 'name',
  properties: {
    label: 'Customer Name',
    nameFormat: 'simple',
    isRequired: true
  }
});

// 2. Product selection
await mcp_call('gf_add_field', {
  form_id: 3,
  field_type: 'product',
  properties: {
    label: 'Select Product',
    productField: 'singleproduct',
    basePrice: 99.99,
    choices: [
      { text: 'Basic Plan - $99', value: 'basic|99' },
      { text: 'Pro Plan - $199', value: 'pro|199' },
      { text: 'Enterprise Plan - $399', value: 'enterprise|399' }
    ]
  }
});

// 3. Quantity selector
await mcp_call('gf_add_field', {
  form_id: 3,
  field_type: 'quantity',
  properties: {
    label: 'Quantity',
    defaultValue: 1,
    min: 1,
    max: 10
  }
});

// 4. Billing address
await mcp_call('gf_add_field', {
  form_id: 3,
  field_type: 'address',
  properties: {
    label: 'Billing Address',
    addressType: 'us',
    isRequired: true
  }
});

// 5. Shipping options
await mcp_call('gf_add_field', {
  form_id: 3,
  field_type: 'shipping',
  properties: {
    label: 'Shipping Method',
    choices: [
      { text: 'Standard (5-7 days) - Free', value: 'standard|0' },
      { text: 'Express (2-3 days) - $9.99', value: 'express|9.99' },
      { text: 'Overnight - $24.99', value: 'overnight|24.99' }
    ]
  }
});

// 6. Order total (calculated)
await mcp_call('gf_add_field', {
  form_id: 3,
  field_type: 'total',
  properties: {
    label: 'Order Total',
    enableCalculation: true
  }
});

// 7. Payment information
await mcp_call('gf_add_field', {
  form_id: 3,
  field_type: 'creditcard',
  properties: {
    label: 'Payment Information',
    isRequired: true,
    creditCardTypes: ['visa', 'mastercard', 'amex', 'discover']
  }
});
```

### Add Product Options

```javascript
// Add product options/variants
await mcp_call('gf_add_field', {
  form_id: 3,
  field_type: 'option',
  properties: {
    label: 'Product Options',
    productField: 2, // Links to product field
    choices: [
      { text: 'Extended Support (+$50)', value: 'support|50' },
      { text: 'Setup Service (+$100)', value: 'setup|100' },
      { text: 'Training Package (+$200)', value: 'training|200' }
    ]
  }
});
```

## Multi-page Forms

### Creating a Multi-step Registration Form

```javascript
// Page 1: Personal Information
await mcp_call('gf_add_field', {
  form_id: 4,
  field_type: 'name',
  properties: {
    label: 'Full Name',
    nameFormat: 'advanced',
    isRequired: true
  },
  position: { mode: 'append', page: 1 }
});

await mcp_call('gf_add_field', {
  form_id: 4,
  field_type: 'date',
  properties: {
    label: 'Date of Birth',
    dateFormat: 'mdy',
    isRequired: true
  },
  position: { mode: 'append', page: 1 }
});

// Add page break
await mcp_call('gf_add_field', {
  form_id: 4,
  field_type: 'page',
  properties: {
    label: 'Contact Information',
    nextButton: 'Continue to Contact Info',
    previousButton: 'Back'
  }
});

// Page 2: Contact Information
await mcp_call('gf_add_field', {
  form_id: 4,
  field_type: 'email',
  properties: {
    label: 'Email Address',
    isRequired: true,
    emailConfirmEnabled: true
  },
  position: { mode: 'append', page: 2 }
});

await mcp_call('gf_add_field', {
  form_id: 4,
  field_type: 'address',
  properties: {
    label: 'Home Address',
    addressType: 'us',
    isRequired: true
  },
  position: { mode: 'append', page: 2 }
});

// Add another page break
await mcp_call('gf_add_field', {
  form_id: 4,
  field_type: 'page',
  properties: {
    label: 'Account Setup',
    nextButton: 'Create Account',
    previousButton: 'Back to Contact'
  }
});

// Page 3: Account Information
await mcp_call('gf_add_field', {
  form_id: 4,
  field_type: 'text',
  properties: {
    label: 'Username',
    isRequired: true,
    maxLength: 20
  },
  position: { mode: 'append', page: 3 }
});

await mcp_call('gf_add_field', {
  form_id: 4,
  field_type: 'password',
  properties: {
    label: 'Password',
    isRequired: true,
    passwordConfirmEnabled: true,
    passwordStrengthEnabled: true
  },
  position: { mode: 'append', page: 3 }
});
```

## Conditional Logic

### Show Fields Based on Selection

```javascript
// 1. Add trigger field (membership type)
const membershipField = await mcp_call('gf_add_field', {
  form_id: 5,
  field_type: 'radio',
  properties: {
    label: 'Membership Type',
    choices: [
      { text: 'Individual', value: 'individual' },
      { text: 'Business', value: 'business' },
      { text: 'Non-profit', value: 'nonprofit' }
    ],
    isRequired: true
  }
});

// 2. Add business-specific fields with conditional logic
await mcp_call('gf_add_field', {
  form_id: 5,
  field_type: 'text',
  properties: {
    label: 'Business Name',
    isRequired: true,
    conditionalLogic: {
      enabled: true,
      logicType: 'all',
      rules: [
        {
          fieldId: membershipField.field.id,
          operator: 'is',
          value: 'business'
        }
      ]
    }
  }
});

await mcp_call('gf_add_field', {
  form_id: 5,
  field_type: 'text',
  properties: {
    label: 'Tax ID Number',
    conditionalLogic: {
      enabled: true,
      logicType: 'all', 
      rules: [
        {
          fieldId: membershipField.field.id,
          operator: 'is',
          value: 'business'
        }
      ]
    }
  }
});

// 3. Add non-profit specific field
await mcp_call('gf_add_field', {
  form_id: 5,
  field_type: 'fileupload',
  properties: {
    label: 'Non-profit Certification',
    allowedExtensions: 'pdf,doc,docx',
    conditionalLogic: {
      enabled: true,
      logicType: 'all',
      rules: [
        {
          fieldId: membershipField.field.id,
          operator: 'is',
          value: 'nonprofit'
        }
      ]
    }
  }
});
```

### Complex Conditional Logic

```javascript
// Show field when multiple conditions are met
await mcp_call('gf_add_field', {
  form_id: 5,
  field_type: 'textarea',
  properties: {
    label: 'Special Requirements',
    conditionalLogic: {
      enabled: true,
      logicType: 'all', // ALL conditions must be true
      rules: [
        {
          fieldId: 2, // membership type
          operator: 'is',
          value: 'business'
        },
        {
          fieldId: 7, // another field
          operator: 'greater_than',
          value: '100'
        }
      ]
    }
  }
});

// Show field when ANY condition is met
await mcp_call('gf_add_field', {
  form_id: 5,
  field_type: 'text',
  properties: {
    label: 'Additional Contact',
    conditionalLogic: {
      enabled: true,
      logicType: 'any', // ANY condition can be true
      rules: [
        {
          fieldId: 2,
          operator: 'is',
          value: 'business'
        },
        {
          fieldId: 2,
          operator: 'is',
          value: 'nonprofit'
        }
      ]
    }
  }
});
```

## Advanced Scenarios

### Dynamic Form Builder

```javascript
async function buildSurveyForm(formId, questions) {
  for (const [index, question] of questions.entries()) {
    let fieldType = 'text';
    let properties = {
      label: question.text,
      isRequired: question.required || false
    };

    // Determine field type based on question type
    switch (question.type) {
      case 'multiple_choice':
        fieldType = 'radio';
        properties.choices = question.options.map(opt => ({
          text: opt.text,
          value: opt.value
        }));
        break;
        
      case 'checkbox':
        fieldType = 'checkbox';
        properties.choices = question.options.map(opt => ({
          text: opt.text,
          value: opt.value
        }));
        break;
        
      case 'dropdown':
        fieldType = 'select';
        properties.choices = question.options.map(opt => ({
          text: opt.text,
          value: opt.value
        }));
        break;
        
      case 'long_text':
        fieldType = 'textarea';
        properties.rows = 4;
        break;
        
      case 'number':
        fieldType = 'number';
        properties.numberFormat = 'decimal_dot';
        break;
        
      case 'email':
        fieldType = 'email';
        break;
        
      case 'date':
        fieldType = 'date';
        properties.dateFormat = 'mdy';
        break;
    }

    // Add field to form
    await mcp_call('gf_add_field', {
      form_id: formId,
      field_type: fieldType,
      properties: properties
    });

    // Add section break between questions if specified
    if (question.addSectionBreak && index < questions.length - 1) {
      await mcp_call('gf_add_field', {
        form_id: formId,
        field_type: 'section',
        properties: {
          label: `Section ${index + 2}`,
          description: 'Please continue with the next set of questions'
        }
      });
    }
  }
}

// Usage example
const surveyQuestions = [
  {
    text: 'What is your age group?',
    type: 'multiple_choice',
    required: true,
    options: [
      { text: '18-25', value: '18-25' },
      { text: '26-35', value: '26-35' },
      { text: '36-45', value: '36-45' },
      { text: '46+', value: '46+' }
    ]
  },
  {
    text: 'Which products do you use?',
    type: 'checkbox',
    required: false,
    options: [
      { text: 'Product A', value: 'product-a' },
      { text: 'Product B', value: 'product-b' },
      { text: 'Product C', value: 'product-c' }
    ],
    addSectionBreak: true
  },
  {
    text: 'How satisfied are you with our service?',
    type: 'dropdown',
    required: true,
    options: [
      { text: 'Very Satisfied', value: '5' },
      { text: 'Satisfied', value: '4' },
      { text: 'Neutral', value: '3' },
      { text: 'Dissatisfied', value: '2' },
      { text: 'Very Dissatisfied', value: '1' }
    ]
  },
  {
    text: 'Please provide additional feedback',
    type: 'long_text',
    required: false
  }
];

await buildSurveyForm(6, surveyQuestions);
```

### Field Migration Between Forms

```javascript
async function migrateFieldsToNewForm(sourceFormId, targetFormId, fieldIds) {
  // Get source form
  const sourceForm = await mcp_call('gf_get_form', { form_id: sourceFormId });
  
  for (const fieldId of fieldIds) {
    // Find field in source form
    const sourceField = sourceForm.fields.find(f => f.id == fieldId);
    
    if (!sourceField) {
      console.log(`Field ${fieldId} not found in source form`);
      continue;
    }

    // Copy field properties (excluding ID)
    const { id, ...fieldProperties } = sourceField;
    
    // Add field to target form
    const result = await mcp_call('gf_add_field', {
      form_id: targetFormId,
      field_type: sourceField.type,
      properties: fieldProperties
    });

    if (result.success) {
      console.log(`Migrated field "${sourceField.label}" to form ${targetFormId}`);
    } else {
      console.log(`Failed to migrate field "${sourceField.label}": ${result.error}`);
    }
  }
}

// Usage: Migrate specific fields from form 1 to form 2
await migrateFieldsToNewForm(1, 2, [3, 5, 7]);
```

### Bulk Field Operations

```javascript
async function bulkUpdateFieldLabels(formId, labelMappings) {
  for (const [fieldId, newLabel] of Object.entries(labelMappings)) {
    try {
      await mcp_call('gf_update_field', {
        form_id: formId,
        field_id: parseInt(fieldId),
        properties: {
          label: newLabel
        }
      });
      console.log(`Updated field ${fieldId}: "${newLabel}"`);
    } catch (error) {
      console.log(`Failed to update field ${fieldId}: ${error.message}`);
    }
  }
}

// Usage: Update multiple field labels at once
await bulkUpdateFieldLabels(1, {
  '3': 'Full Name (Required)',
  '4': 'Business Email Address',
  '5': 'Phone Number (Optional)',
  '6': 'Company or Organization'
});
```

### Form Template System

```javascript
async function applyFormTemplate(formId, templateName) {
  const templates = {
    'contact': [
      { type: 'name', label: 'Full Name', required: true },
      { type: 'email', label: 'Email Address', required: true },
      { type: 'phone', label: 'Phone Number', required: false },
      { type: 'textarea', label: 'Message', required: true }
    ],
    'registration': [
      { type: 'name', label: 'Full Name', required: true },
      { type: 'email', label: 'Email Address', required: true },
      { type: 'date', label: 'Date of Birth', required: true },
      { type: 'address', label: 'Address', required: true },
      { type: 'password', label: 'Password', required: true }
    ],
    'order': [
      { type: 'name', label: 'Customer Name', required: true },
      { type: 'email', label: 'Email Address', required: true },
      { type: 'product', label: 'Select Product', required: true },
      { type: 'quantity', label: 'Quantity', required: true },
      { type: 'address', label: 'Billing Address', required: true },
      { type: 'creditcard', label: 'Payment Information', required: true }
    ]
  };

  const template = templates[templateName];
  if (!template) {
    throw new Error(`Template "${templateName}" not found`);
  }

  for (const field of template) {
    const properties = {
      label: field.label,
      isRequired: field.required
    };

    // Add template-specific properties
    if (field.type === 'textarea') {
      properties.rows = 4;
    } else if (field.type === 'date') {
      properties.dateFormat = 'mdy';
    } else if (field.type === 'address') {
      properties.addressType = 'us';
    } else if (field.type === 'password') {
      properties.passwordConfirmEnabled = true;
    }

    await mcp_call('gf_add_field', {
      form_id: formId,
      field_type: field.type,
      properties: properties
    });
  }

  console.log(`Applied "${templateName}" template to form ${formId}`);
}

// Usage: Apply templates to forms
await applyFormTemplate(7, 'contact');
await applyFormTemplate(8, 'registration'); 
await applyFormTemplate(9, 'order');
```

## Performance Tips

### Batch Operations for Better Performance

```javascript
// Instead of individual calls
async function addFieldsSlowly(formId, fields) {
  for (const field of fields) {
    await mcp_call('gf_add_field', {
      form_id: formId,
      field_type: field.type,
      properties: field.properties
    });
  }
}

// Better: Use Promise.all for concurrent operations
async function addFieldsFaster(formId, fields) {
  const promises = fields.map(field => 
    mcp_call('gf_add_field', {
      form_id: formId,
      field_type: field.type,
      properties: field.properties
    })
  );
  
  const results = await Promise.all(promises);
  return results;
}
```

### Cache Field Types for Repeated Use

```javascript
let fieldTypesCache = null;

async function getFieldTypes(useCache = true) {
  if (useCache && fieldTypesCache) {
    return fieldTypesCache;
  }

  const result = await mcp_call('gf_list_field_types', {
    include_variants: true
  });

  if (result.success) {
    fieldTypesCache = result.field_types;
  }

  return fieldTypesCache;
}

// Usage
const fieldTypes = await getFieldTypes(); // Fetches from API
const fieldTypesAgain = await getFieldTypes(); // Uses cache
```

These examples demonstrate the practical applications of the field operations system. Each example can be adapted to your specific needs and integrated into larger form management workflows.