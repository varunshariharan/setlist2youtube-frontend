# 🧪 Testing Best Practices

## ✅ Proper Negative Test Case Design

### ❌ Wrong Way (What I Did Initially)
```javascript
// BAD: Test expects system to be in bad state
it('should fail if using placeholder client ID', () => {
  const badManifest = { oauth2: { client_id: 'placeholder' } };
  expect(badManifest.oauth2.client_id).not.toBe('placeholder'); // This will always fail!
});
```

**Problems:**
- Test will always fail when testing the negative case
- Doesn't test any validation logic
- No way to verify the system handles bad input correctly
- Confusing - test failure doesn't mean the system is working

### ✅ Correct Way (Fixed Implementation)
```javascript
// GOOD: Test expects validation function to properly reject bad input
it('should detect and reject placeholder client ID', () => {
  const validateClientId = (clientId) => {
    if (clientId === 'placeholder') {
      throw new Error('Invalid client ID: placeholder value detected');
    }
    return true;
  };

  // Test that bad input is properly rejected (should throw)
  expect(() => validateClientId('placeholder'))
    .toThrow('Invalid client ID: placeholder value detected');
  
  // Test that good input is accepted (should not throw)
  expect(() => validateClientId('real-client-id.apps.googleusercontent.com'))
    .not.toThrow();
});
```

**Benefits:**
- ✅ Test passes when system correctly handles bad input
- ✅ Tests actual validation logic
- ✅ Verifies both positive and negative cases
- ✅ Clear: test success means system is working correctly

## 🎯 Negative Testing Principles

### 1. **Test the Validator, Not the Bad Data**
```javascript
// ❌ BAD: Testing data itself
expect(badData).not.toBe(badValue);

// ✅ GOOD: Testing validation function
expect(() => validate(badData)).toThrow();
```

### 2. **Expect Errors for Invalid Input**
```javascript
// ✅ Test should PASS when error is properly thrown
it('should reject invalid email format', () => {
  expect(() => validateEmail('not-an-email'))
    .toThrow('Invalid email format');
});
```

### 3. **Test Both Positive and Negative Cases**
```javascript
it('should validate email addresses correctly', () => {
  // Negative cases - should throw errors
  expect(() => validateEmail('')).toThrow();
  expect(() => validateEmail('invalid')).toThrow();
  expect(() => validateEmail('@example.com')).toThrow();
  
  // Positive cases - should not throw
  expect(() => validateEmail('user@example.com')).not.toThrow();
  expect(() => validateEmail('test.email+tag@domain.co.uk')).not.toThrow();
});
```

### 4. **Use Descriptive Test Names**
```javascript
// ❌ BAD: Unclear what the test expects
it('should fail with bad client ID', () => {});

// ✅ GOOD: Clear what behavior is being tested
it('should detect and reject placeholder client ID', () => {});
it('should throw error when client ID is missing', () => {});
```

## 📋 Testing Checklist

### For Each Validation Function:
- [ ] ✅ Test throws appropriate error for invalid input
- [ ] ✅ Test accepts valid input without throwing
- [ ] ✅ Test error messages are meaningful
- [ ] ✅ Test edge cases (null, undefined, empty string)
- [ ] ✅ Test boundary conditions

### Example: Complete Validation Test
```javascript
describe('Client ID Validation', () => {
  const validateClientId = (clientId) => {
    if (!clientId) {
      throw new Error('Client ID is required');
    }
    if (typeof clientId !== 'string') {
      throw new Error('Client ID must be a string');
    }
    if (clientId === 'placeholder') {
      throw new Error('Client ID cannot be placeholder');
    }
    if (clientId.includes('${')) {
      throw new Error('Client ID contains unresolved template variable');
    }
    if (!clientId.endsWith('.apps.googleusercontent.com')) {
      throw new Error('Client ID must be a valid Google OAuth client ID');
    }
    return true;
  };

  describe('should reject invalid client IDs', () => {
    it('should throw when client ID is null', () => {
      expect(() => validateClientId(null))
        .toThrow('Client ID is required');
    });

    it('should throw when client ID is undefined', () => {
      expect(() => validateClientId(undefined))
        .toThrow('Client ID is required');
    });

    it('should throw when client ID is empty string', () => {
      expect(() => validateClientId(''))
        .toThrow('Client ID is required');
    });

    it('should throw when client ID is not a string', () => {
      expect(() => validateClientId(123))
        .toThrow('Client ID must be a string');
    });

    it('should throw when client ID is placeholder', () => {
      expect(() => validateClientId('placeholder'))
        .toThrow('Client ID cannot be placeholder');
    });

    it('should throw when client ID has template variable', () => {
      expect(() => validateClientId('${GOOGLE_CLIENT_ID}'))
        .toThrow('Client ID contains unresolved template variable');
    });

    it('should throw when client ID format is invalid', () => {
      expect(() => validateClientId('invalid-format'))
        .toThrow('Client ID must be a valid Google OAuth client ID');
    });
  });

  describe('should accept valid client IDs', () => {
    it('should accept real Google OAuth client ID', () => {
      expect(() => validateClientId('123456789-abc123.apps.googleusercontent.com'))
        .not.toThrow();
    });

    it('should accept test client ID in test environment', () => {
      expect(() => validateClientId('test-client-id.apps.googleusercontent.com'))
        .not.toThrow();
    });
  });
});
```

## 🔧 Refactoring Bad Tests

### Original Problem Pattern:
```javascript
// This will always fail - it's testing the wrong thing
it('should fail if using placeholder', () => {
  const badConfig = { value: 'placeholder' };
  expect(badConfig.value).not.toBe('placeholder'); // ❌ Always fails
});
```

### Refactored Solution:
```javascript
// This tests that validation correctly catches the problem
it('should detect and reject placeholder values', () => {
  const validator = (config) => {
    if (config.value === 'placeholder') {
      throw new Error('Placeholder values not allowed');
    }
    return true;
  };

  const badConfig = { value: 'placeholder' };
  const goodConfig = { value: 'real-value' };

  expect(() => validator(badConfig)).toThrow('Placeholder values not allowed');
  expect(() => validator(goodConfig)).not.toThrow();
});
```

## 🎯 Key Takeaways

1. **Negative tests should PASS when the system correctly handles bad input**
2. **Test the validation logic, not the existence of bad data**
3. **Use `expect().toThrow()` for testing error conditions**
4. **Always test both positive and negative cases**
5. **Make test names clearly indicate expected behavior**

**The goal of negative testing is to verify that your system gracefully handles invalid input - not to create tests that always fail!**
