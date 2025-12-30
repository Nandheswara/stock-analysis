# GitHub Copilot Instructions for This Repository

This document defines strict coding standards and best practices that GitHub Copilot must follow when generating code for this repository. All generated code must adhere to these guidelines without exception.

---

## 1. General Clean Code Principles

- **DRY (Don't Repeat Yourself)**: Eliminate code duplication. Extract repeated logic into reusable functions or modules.
- **SOLID Principles**: Apply Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, and Dependency Inversion principles.
- **KISS (Keep It Simple, Stupid)**: Prefer simple, straightforward solutions over complex ones.
- **YAGNI (You Aren't Gonna Need It)**: Don't add functionality until it's necessary.
- **Boy Scout Rule**: Leave code cleaner than you found it.
- **Separation of Concerns**: Keep business logic, presentation, and data layers separate.
- **Fail Fast**: Validate inputs early and throw meaningful errors.
- **Avoid Magic Numbers**: Use named constants instead of hardcoded values.
- **Single Level of Abstraction**: Each function should operate at one level of abstraction.
- **Code for Readability**: Write code that humans can understand easily.

---

## 2. Naming Conventions

### Variables
- Use **camelCase** for JavaScript/TypeScript variables: `userAccount`, `totalPrice`
- Use **snake_case** for Python variables: `user_account`, `total_price`
- Use **camelCase** for Java variables: `userName`, `orderStatus`
- Use descriptive names that reveal intent: `customerEmail` instead of `ce`
- Boolean variables should start with `is`, `has`, `can`, `should`: `isActive`, `hasPermission`
- Avoid single-letter variables except for loop counters (`i`, `j`, `k`)

### Functions/Methods
- Use **camelCase**: `calculateTotalPrice()`, `fetchUserData()`
- Use verb-noun pattern: `getUserById()`, `validateEmail()`, `saveOrder()`
- Pure functions should describe what they return: `getFullName()`, `computeDiscount()`
- Event handlers should start with `handle` or `on`: `handleClick()`, `onSubmit()`
- Async functions should clearly indicate asynchronous nature if not obvious from context

### Constants
- Use **UPPER_SNAKE_CASE**: `MAX_RETRY_COUNT`, `API_BASE_URL`, `DEFAULT_TIMEOUT`
- Group related constants in objects or enums when appropriate

### Classes
- Use **PascalCase**: `UserService`, `OrderRepository`, `PaymentProcessor`
- Use nouns or noun phrases
- Interface names should describe capability: `Serializable`, `Comparable`, `IUserRepository`

### Files
- **JavaScript/TypeScript**: Use kebab-case: `user-service.js`, `payment-processor.ts`
- **Java**: Use PascalCase matching class name: `UserService.java`
- **Python**: Use snake_case: `user_service.py`
- **React Components**: Use PascalCase: `UserProfile.jsx`
- **Test files**: Match source file with `.test` or `.spec` suffix: `user-service.test.js`

### Folders
- Use **kebab-case**: `user-management`, `order-processing`
- Use **plural names** for collections: `components`, `services`, `utils`, `models`
- Group by feature/domain, not by file type (prefer feature-based over layer-based organization)

---

## 3. Language-Specific Standards

### JavaScript / TypeScript

#### General
- Use **ES6+ syntax**: arrow functions, destructuring, template literals, spread operator
- Always use `const` by default; use `let` only when reassignment is necessary; never use `var`
- Use strict equality (`===` and `!==`) over loose equality (`==` and `!=`)
- Prefer functional programming patterns: `map()`, `filter()`, `reduce()` over imperative loops
- Use optional chaining (`?.`) and nullish coalescing (`??`) operators
- Always handle promises with `async/await` or `.catch()` - never leave promises unhandled

#### TypeScript Specifics
- Always define explicit types for function parameters and return values
- Use interfaces for object shapes, types for unions/intersections
- Enable strict mode in `tsconfig.json`
- Avoid `any` type; use `unknown` when type is truly unknown
- Use enums for fixed sets of values
- Leverage union types and type guards
- Use generics for reusable type-safe functions

```typescript
// Good
interface User {
  id: string;
  name: string;
  email: string;
}

async function fetchUser(userId: string): Promise<User> {
  const response = await fetch(`/api/users/${userId}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch user: ${response.statusText}`);
  }
  return response.json();
}

// Bad
async function fetchUser(userId) {
  const response = await fetch(`/api/users/${userId}`);
  return response.json();
}
```

#### Error Handling
- Use try-catch blocks for async operations
- Create custom error classes for specific error types
- Always log errors with context

#### Async Patterns
- Prefer `async/await` over promise chains
- Use `Promise.all()` for parallel operations
- Handle race conditions appropriately

### Java

#### General
- Follow Java Code Conventions and Oracle style guide
- Use Java 8+ features: streams, lambdas, Optional
- Prefer immutability: use `final` for variables that shouldn't change
- Use builder pattern for objects with many parameters
- Implement proper `equals()`, `hashCode()`, and `toString()` methods

#### Package Structure
- Use reverse domain notation: `com.company.project.module`
- Organize by feature/domain, not by layer

#### Best Practices
- Use dependency injection (Spring, CDI)
- Prefer interfaces over concrete implementations in public APIs
- Use try-with-resources for AutoCloseable resources
- Handle checked exceptions appropriately
- Use `Optional` instead of returning null

```java
// Good
public Optional<User> findUserById(String userId) {
    return userRepository.findById(userId);
}

// Bad
public User findUserById(String userId) {
    return userRepository.findById(userId); // might return null
}
```

#### Spring/Spring Boot
- Use constructor injection over field injection
- Keep controllers thin - delegate to services
- Use `@Transactional` appropriately
- Follow REST conventions for endpoint naming

### Python

#### General
- Follow PEP 8 style guide strictly
- Use Python 3.8+ features: f-strings, type hints, walrus operator
- Use list/dict comprehensions when they improve readability
- Prefer context managers (`with` statement) for resource management
- Use dataclasses or Pydantic models for data structures

#### Type Hints
- Always use type hints for function signatures
- Use `typing` module for complex types

```python
from typing import List, Optional, Dict

def process_users(users: List[Dict[str, str]]) -> Optional[str]:
    """Process list of users and return status message."""
    if not users:
        return None
    # processing logic
    return "Success"
```

#### Code Organization
- One class per file for large classes
- Group related functions in modules
- Use `__init__.py` to expose public API

#### Best Practices
- Use virtual environments
- Document with docstrings (Google or NumPy style)
- Use `logging` module, never `print()` for production code
- Handle exceptions explicitly
- Use pytest for testing

---

## 4. HTML / HTL / JSX Coding Standards

### HTML

#### Structure
- Use semantic HTML5 elements: `<header>`, `<nav>`, `<main>`, `<article>`, `<section>`, `<aside>`, `<footer>`
- Maintain proper document structure and hierarchy
- Always include `<!DOCTYPE html>`
- Use lowercase for element names and attributes
- Quote all attribute values with double quotes
- Self-close void elements: `<img />`, `<br />`, `<hr />`

#### Attributes
- Include `alt` text for all images
- Use `title` attributes for additional context where helpful
- Include `lang` attribute on `<html>` tag
- Use `aria-*` attributes for accessibility
- Prefer semantic HTML over `<div>` with roles

#### Performance
- Load critical CSS in `<head>`
- Load JavaScript before closing `</body>` tag or use `defer`/`async`
- Use responsive images with `srcset` and `sizes`
- Lazy load images below the fold: `loading="lazy"`

### HTL (HTML Template Language for AEM)

#### Best Practices
- Use `data-sly-use` for backend logic initialization
- Prefer `data-sly-resource` over JSP includes
- Use `data-sly-test` for conditional rendering
- Use `data-sly-list` for iterations
- Escape output by default (XSS protection): `${properties.title @ context='html'}`
- Use appropriate contexts: `html`, `text`, `attribute`, `uri`, `scriptString`

```html
<!-- Good -->
<div data-sly-use.model="com.company.models.ComponentModel">
    <h2>${model.title @ context='html'}</h2>
    <p data-sly-test="${model.description}">${model.description @ context='html'}</p>
</div>

<!-- Bad -->
<div data-sly-use.model="com.company.models.ComponentModel">
    <h2>${model.title}</h2> <!-- Missing XSS protection -->
</div>
```

### JSX (React)

#### Best Practices
- Use functional components with hooks
- Keep components small and focused (Single Responsibility)
- Extract complex JSX logic into separate components
- Use fragments (`<>...</>`) to avoid unnecessary wrapper divs
- Always provide `key` prop for list items (use stable IDs, not array indices)
- Use PropTypes or TypeScript for prop validation

```jsx
// Good
interface UserCardProps {
  user: User;
  onSelect: (id: string) => void;
}

const UserCard: React.FC<UserCardProps> = ({ user, onSelect }) => {
  return (
    <div className="user-card" onClick={() => onSelect(user.id)}>
      <h3>{user.name}</h3>
      <p>{user.email}</p>
    </div>
  );
};

// Bad
const UserCard = (props) => {
  return (
    <div className="user-card" onClick={() => props.onSelect(props.user.id)}>
      <h3>{props.user.name}</h3>
      <p>{props.user.email}</p>
    </div>
  );
};
```

#### Hooks
- Follow Rules of Hooks (only call at top level, only in function components)
- Use `useMemo` and `useCallback` to optimize performance
- Create custom hooks for reusable stateful logic
- Name custom hooks with `use` prefix: `useAuth`, `useFetch`

---

## 5. SEO Best Practices (MANDATORY)

### Meta Tags
- **REQUIRED** on every page:
  - `<title>`: Unique, descriptive, 50-60 characters
  - `<meta name="description">`: Compelling summary, 150-160 characters
  - `<meta name="viewport" content="width=device-width, initial-scale=1.0">`
  - `<meta charset="UTF-8">`
- **Open Graph tags** for social sharing:
  - `og:title`, `og:description`, `og:image`, `og:url`, `og:type`
- **Twitter Card tags**: `twitter:card`, `twitter:title`, `twitter:description`, `twitter:image`
- Canonical URL: `<link rel="canonical" href="...">`
- Language: `<html lang="en">`

```html
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Stock Analysis Dashboard | Real-Time Market Insights</title>
    <meta name="description" content="Analyze stock performance with real-time data, charts, and insights. Make informed investment decisions with our comprehensive stock analysis tools.">
    <link rel="canonical" href="https://example.com/stock-analysis">
    
    <!-- Open Graph -->
    <meta property="og:title" content="Stock Analysis Dashboard">
    <meta property="og:description" content="Real-time stock market analysis and insights">
    <meta property="og:image" content="https://example.com/images/og-image.jpg">
    <meta property="og:url" content="https://example.com/stock-analysis">
    <meta property="og:type" content="website">
    
    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="Stock Analysis Dashboard">
    <meta name="twitter:description" content="Real-time stock market analysis and insights">
    <meta name="twitter:image" content="https://example.com/images/twitter-image.jpg">
</head>
```

### Heading Structure
- Use **one and only one** `<h1>` per page (main heading)
- Maintain logical heading hierarchy: `<h1>` → `<h2>` → `<h3>` (no skipping levels)
- Use headings to structure content, not for styling
- Include target keywords naturally in headings

### URLs
- Use clean, descriptive URLs: `/stock-analysis/apple` not `/page?id=123`
- Use hyphens to separate words, not underscores
- Keep URLs short and meaningful
- Use lowercase letters
- Avoid dynamic parameters when possible

### Content Optimization
- Place important keywords in first 100 words
- Use keyword variations and semantic keywords naturally
- Write for humans first, search engines second
- Aim for comprehensive, high-quality content (1500+ words for pillar pages)
- Use internal linking with descriptive anchor text
- Add schema.org structured data (JSON-LD format)

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "Stock Analysis Dashboard",
  "description": "Real-time stock market analysis platform",
  "url": "https://example.com/stock-analysis",
  "applicationCategory": "FinanceApplication"
}
</script>
```

### Images
- Always use descriptive `alt` attributes with keywords
- Use descriptive filenames: `stock-market-analysis-chart.jpg` not `img123.jpg`
- Compress images for fast loading
- Use modern formats: WebP with fallbacks
- Implement responsive images with `srcset`

### Performance (SEO Impact)
- Target Core Web Vitals: LCP < 2.5s, FID < 100ms, CLS < 0.1
- Minimize render-blocking resources
- Use CDN for static assets
- Implement caching strategies
- Minify CSS/JS

---

## 6. Performance Best Practices

### General
- **Lazy load** non-critical resources
- **Code splitting**: Load only what's needed for current route/page
- **Tree shaking**: Remove unused code
- **Minimize bundle size**: Analyze and optimize dependencies
- **Use CDN** for static assets
- **Enable compression**: Gzip or Brotli

### JavaScript
- Debounce/throttle expensive operations (scroll, resize, input handlers)
- Use Web Workers for CPU-intensive tasks
- Avoid memory leaks: clean up event listeners, clear timers, abort fetch requests
- Use `requestAnimationFrame` for animations
- Minimize DOM manipulations: batch updates, use fragments

### Images
- Compress images (use tools like ImageOptim, TinyPNG)
- Use modern formats: WebP, AVIF with fallbacks
- Implement responsive images: `srcset`, `sizes`, `picture` element
- Use `loading="lazy"` for below-the-fold images
- Specify width and height to prevent layout shifts

### CSS
- Remove unused CSS
- Use CSS containment for isolated components
- Avoid expensive selectors (universal, descendant)
- Use CSS transforms and opacity for animations (GPU-accelerated)
- Critical CSS inline, defer non-critical CSS

### Caching
- Set appropriate cache headers
- Use service workers for offline capabilities
- Implement versioning/fingerprinting for cache busting
- Cache API responses when appropriate

### Monitoring
- Implement performance monitoring (Web Vitals API)
- Use Lighthouse CI in deployment pipeline
- Set performance budgets

---

## 7. Accessibility (A11Y) Guidelines

### WCAG Compliance
- Target **WCAG 2.1 Level AA** compliance minimum
- Test with automated tools (axe, Lighthouse) and manual testing
- Test with screen readers (NVDA, JAWS, VoiceOver)

### Semantic HTML
- Use semantic elements appropriately
- Use `<button>` for actions, `<a>` for navigation
- Use proper form elements with labels
- Use `<table>` only for tabular data

### ARIA
- Use ARIA attributes when semantic HTML is insufficient
- Follow first rule of ARIA: Don't use ARIA if semantic HTML exists
- Common ARIA attributes:
  - `aria-label`, `aria-labelledby` for accessible names
  - `aria-describedby` for additional descriptions
  - `aria-hidden="true"` for decorative elements
  - `role` when semantic element isn't available
  - `aria-expanded`, `aria-controls` for interactive components

### Keyboard Navigation
- All interactive elements must be keyboard accessible
- Visible focus indicators (never `outline: none` without alternative)
- Logical tab order (use `tabindex="0"` for custom interactive elements)
- Implement keyboard shortcuts for common actions
- Support escape key to close modals/dropdowns

### Forms
- Associate labels with inputs: `<label for="email">` or wrap input
- Provide clear error messages
- Use `aria-invalid` and `aria-describedby` for error messages
- Use appropriate input types: `email`, `tel`, `number`, `date`
- Use `autocomplete` attributes appropriately

### Color and Contrast
- Minimum contrast ratio: 4.5:1 for normal text, 3:1 for large text
- Don't rely on color alone to convey information
- Support prefers-reduced-motion for animations

### Content
- Use clear, simple language
- Provide text alternatives for non-text content
- Create descriptive link text (avoid "click here")
- Use proper heading hierarchy

```html
<!-- Good -->
<button aria-label="Close dialog" class="close-btn">
    <span aria-hidden="true">&times;</span>
</button>

<form>
    <label for="email">Email Address</label>
    <input 
        type="email" 
        id="email" 
        name="email" 
        autocomplete="email"
        aria-describedby="email-error"
        aria-invalid="false"
    >
    <span id="email-error" role="alert"></span>
</form>

<!-- Bad -->
<div onclick="closeDialog()">X</div>

<input type="text" placeholder="Email">
```

---

## 8. Security Best Practices

### Input Validation
- **Validate all user input** on both client and server side
- Never trust client-side validation alone
- Use allowlists (whitelist) over blocklists (blacklist)
- Sanitize and escape user input before rendering
- Use parameterized queries to prevent SQL injection

### XSS Prevention
- Escape HTML output context-appropriately
- Use Content Security Policy (CSP) headers
- Sanitize HTML input (use libraries like DOMPurify)
- Avoid `dangerouslySetInnerHTML` in React without sanitization
- Use `textContent` instead of `innerHTML` when possible

### Authentication & Authorization
- Use strong password policies
- Implement multi-factor authentication (MFA)
- Hash passwords with bcrypt, Argon2, or PBKDF2
- Use secure session management
- Implement proper role-based access control (RBAC)
- Never store sensitive data in localStorage/sessionStorage
- Use httpOnly, secure, SameSite cookies

### API Security
- Use HTTPS everywhere (enforce with HSTS)
- Implement rate limiting
- Use API keys and rotate regularly
- Validate content-type headers
- Implement CORS properly (don't use `*`)
- Use JWT tokens securely (short expiration, refresh tokens)

### Dependencies
- Keep dependencies up to date
- Audit dependencies regularly (`npm audit`, `pip-audit`)
- Use lock files (`package-lock.json`, `Pipfile.lock`)
- Remove unused dependencies
- Be cautious with packages with few maintainers

### Secrets Management
- **NEVER** commit secrets, API keys, passwords to version control
- Use environment variables
- Use secret management tools (AWS Secrets Manager, Azure Key Vault, HashiCorp Vault)
- Rotate secrets regularly
- Use `.env.example` with dummy values

### Error Handling
- Don't expose stack traces or sensitive errors to users
- Log errors securely server-side
- Use generic error messages for users
- Implement proper logging and monitoring

---

## 9. AEM-Specific Coding Standards

### Sling Models

#### Best Practices
- Use `@Model(adaptables = {Resource.class, SlingHttpServletRequest.class})`
- Prefer `Resource` over `SlingHttpServletRequest` when request context not needed
- Use `@DefaultInjectionStrategy(DefaultInjectionStrategy.OPTIONAL)` at class level
- Use `@ValueMapValue` for simple property injection
- Use `@ChildResource` for child nodes
- Use `@OSGiService` for service injection
- Keep models stateless and side-effect free
- Use `@PostConstruct` for initialization logic
- Implement proper null checks and default values

```java
@Model(
    adaptables = {Resource.class},
    adapters = {ComponentModel.class},
    resourceType = {ComponentModel.RESOURCE_TYPE},
    defaultInjectionStrategy = DefaultInjectionStrategy.OPTIONAL
)
public class ComponentModel {
    
    protected static final String RESOURCE_TYPE = "myapp/components/content/component";
    
    @ValueMapValue
    @Default(values = "Default Title")
    private String title;
    
    @ValueMapValue
    private String description;
    
    @OSGiService
    private UserService userService;
    
    @PostConstruct
    protected void init() {
        // Initialization logic
    }
    
    public String getTitle() {
        return title;
    }
    
    public String getDescription() {
        return StringUtils.defaultString(description);
    }
}
```

### OSGi Services

#### Configuration
- Use `@Component` annotation
- Provide proper service interfaces
- Use `@Activate`, `@Modified`, `@Deactivate` lifecycle methods
- Use OSGi R7 annotations
- Use metatype annotations for configuration

```java
@Component(
    service = UserService.class,
    property = {
        "service.description=User Service Implementation"
    }
)
@Designate(ocd = UserServiceConfig.class)
public class UserServiceImpl implements UserService {
    
    @Activate
    protected void activate(UserServiceConfig config) {
        // Activation logic
    }
    
    @Modified
    protected void modified(UserServiceConfig config) {
        // Update configuration
    }
    
    @Deactivate
    protected void deactivate() {
        // Cleanup
    }
}
```

### ResourceResolver Handling

#### Critical Rules
- **ALWAYS** close ResourceResolver (use try-with-resources)
- Never use administrative ResourceResolver in production
- Use service users with minimal required permissions
- Always check for null when getting resources

```java
// Good
try (ResourceResolver resolver = resourceResolverFactory.getServiceResourceResolver(authInfo)) {
    Resource resource = resolver.getResource(path);
    if (resource != null) {
        // Process resource
    }
} catch (LoginException e) {
    logger.error("Failed to obtain ResourceResolver", e);
}

// Bad
ResourceResolver resolver = resourceResolverFactory.getAdministrativeResourceResolver(null);
// Missing close() - resource leak
```

### JCR Best Practices
- Use JCR SQL2 for queries (avoid XPath)
- Limit query results with `setLimit()`
- Use indexes for query performance
- Avoid traversal queries
- Don't store large binary data in JCR (use S3, DAM)

### Dispatcher / Caching

#### Configuration
- Cache as much as possible at dispatcher level
- Use proper cache invalidation rules
- Implement flush agents correctly
- Use Sling Dynamic Include (SDI) for personalized content
- Cache HTML at dispatcher, not JSON (unless appropriate)
- Set proper cache headers

#### Component Development
- Mark components as cacheable when possible
- Use client-side rendering for personalized content
- Avoid mixing cached and uncached content
- Consider TTL for time-sensitive content

### Workflows
- Keep workflow steps lightweight
- Avoid long-running operations in workflow steps
- Use external processes for heavy lifting
- Implement proper error handling and retry logic

---

## 10. Logging and Error Handling Standards

### Logging Levels
- **ERROR**: Errors requiring immediate attention, application failures
- **WARN**: Warnings about unexpected situations that don't prevent operation
- **INFO**: Important business events, application lifecycle events
- **DEBUG**: Detailed information for debugging (disabled in production)
- **TRACE**: Very detailed information (rarely used)

### Best Practices

#### Use Appropriate Logging Framework
- JavaScript: Winston, Bunyan, Pino
- Java: SLF4J with Logback or Log4j2
- Python: `logging` module
- AEM: SLF4J (built-in)

#### Structured Logging
- Log in structured format (JSON) for easy parsing
- Include contextual information: user ID, session ID, request ID, timestamp
- Use consistent log message formats

```javascript
// Good (structured logging)
logger.info({
    message: 'User login successful',
    userId: user.id,
    email: user.email,
    ipAddress: req.ip,
    timestamp: new Date().toISOString()
});

// Bad (unstructured)
logger.info('User logged in');
```

#### Security
- **NEVER** log sensitive data: passwords, tokens, credit card numbers, PII
- Mask or redact sensitive information if logging is necessary
- Be careful with error stack traces in production

#### Performance
- Use appropriate log levels
- Avoid expensive operations in log statements
- Use lazy evaluation or guard clauses for debug logging

```java
// Good
if (logger.isDebugEnabled()) {
    logger.debug("Processing user: {}", expensiveOperation());
}

// Bad
logger.debug("Processing user: " + expensiveOperation()); // Always executed
```

### Error Handling

#### Try-Catch Blocks
- Catch specific exceptions, not generic `Exception` unless necessary
- Always log caught exceptions with context
- Rethrow or wrap exceptions appropriately
- Clean up resources in `finally` or use try-with-resources

```java
// Good
try {
    processOrder(order);
} catch (PaymentException e) {
    logger.error("Payment failed for order: {}", order.getId(), e);
    throw new OrderProcessingException("Payment processing failed", e);
} catch (InventoryException e) {
    logger.error("Inventory check failed for order: {}", order.getId(), e);
    // Handle inventory issue
}

// Bad
try {
    processOrder(order);
} catch (Exception e) {
    // Swallowing exception
}
```

#### JavaScript/TypeScript
- Use custom error classes for specific error types
- Always reject promises with Error objects
- Handle async errors with try-catch or `.catch()`

```typescript
// Good
class ValidationError extends Error {
    constructor(message: string, public field: string) {
        super(message);
        this.name = 'ValidationError';
    }
}

async function createUser(userData: UserData): Promise<User> {
    try {
        if (!isValidEmail(userData.email)) {
            throw new ValidationError('Invalid email format', 'email');
        }
        return await userRepository.create(userData);
    } catch (error) {
        logger.error('Failed to create user', { error, userData: sanitize(userData) });
        throw error;
    }
}
```

#### User-Facing Errors
- Show user-friendly error messages
- Don't expose internal error details or stack traces
- Provide actionable guidance when possible
- Log detailed errors server-side

---

## 11. Testing Standards

### Test Coverage
- Minimum **80% code coverage** for new code
- **100% coverage** for critical paths (authentication, payment, data validation)
- Prioritize unit tests > integration tests > E2E tests (test pyramid)

### Unit Tests

#### Best Practices
- Follow AAA pattern: Arrange, Act, Assert
- One assertion per test (or logically grouped assertions)
- Test one thing at a time
- Use descriptive test names: `should_ReturnUser_When_ValidIdProvided`
- Mock external dependencies
- Test edge cases and error conditions
- Keep tests fast (< 100ms per unit test)

```typescript
// Good
describe('UserService', () => {
    describe('getUserById', () => {
        it('should return user when valid ID is provided', async () => {
            // Arrange
            const mockUser = { id: '123', name: 'John Doe' };
            const mockRepository = { findById: jest.fn().mockResolvedValue(mockUser) };
            const service = new UserService(mockRepository);
            
            // Act
            const result = await service.getUserById('123');
            
            // Assert
            expect(result).toEqual(mockUser);
            expect(mockRepository.findById).toHaveBeenCalledWith('123');
        });
        
        it('should throw error when user not found', async () => {
            // Arrange
            const mockRepository = { findById: jest.fn().mockResolvedValue(null) };
            const service = new UserService(mockRepository);
            
            // Act & Assert
            await expect(service.getUserById('999')).rejects.toThrow('User not found');
        });
    });
});
```

### Integration Tests
- Test interaction between components/modules
- Use test databases or containers (Docker)
- Clean up test data after tests
- Test realistic scenarios

### E2E Tests
- Test critical user journeys
- Use tools: Playwright, Cypress, Selenium
- Run in CI/CD pipeline
- Keep E2E test suite small and focused

### Test Organization
- Mirror source code structure in test folders
- Group related tests with `describe` blocks
- Use `beforeEach`/`afterEach` for setup/teardown
- Use test fixtures and factories for test data

### JavaScript/TypeScript Testing
- Framework: Jest, Vitest, Mocha
- React testing: React Testing Library (not Enzyme)
- Mock API calls: MSW (Mock Service Worker)

### Java Testing
- Framework: JUnit 5 (Jupiter)
- Mocking: Mockito
- Use `@Test`, `@BeforeEach`, `@AfterEach`
- Use assertions from AssertJ or Hamcrest

### Python Testing
- Framework: pytest
- Use fixtures for setup
- Use parametrized tests for multiple inputs
- Mock with `unittest.mock` or `pytest-mock`

---

## 12. Documentation Standards

### Code Comments

#### When to Comment
- Complex algorithms or business logic
- Non-obvious workarounds or hacks
- Public APIs and interfaces
- Regular expressions
- Magic numbers that can't be extracted

#### When NOT to Comment
- Obvious code (comments should not repeat code)
- Instead of writing clear code

```javascript
// Bad - obvious comment
// Increment counter by 1
counter++;

// Good - explains why
// Use exponential backoff to avoid overwhelming the API during high traffic
const delay = Math.min(1000 * Math.pow(2, retryCount), 30000);
```

### Function/Method Documentation

#### JavaScript/TypeScript (JSDoc)
```typescript
/**
 * Fetches user data from the API with retry logic.
 * 
 * @param userId - The unique identifier of the user
 * @param options - Optional configuration for the request
 * @returns Promise resolving to User object
 * @throws {APIError} When API request fails after all retries
 * @example
 * const user = await fetchUser('123', { timeout: 5000 });
 */
async function fetchUser(userId: string, options?: RequestOptions): Promise<User> {
    // Implementation
}
```

#### Java (JavaDoc)
```java
/**
 * Processes a payment transaction with fraud detection.
 * 
 * @param payment the payment details including amount and method
 * @param customer the customer making the payment
 * @return the transaction result with confirmation ID
 * @throws PaymentException if payment processing fails
 * @throws FraudException if fraud is detected
 * @since 1.2.0
 */
public TransactionResult processPayment(Payment payment, Customer customer) 
        throws PaymentException, FraudException {
    // Implementation
}
```

#### Python (Docstrings)
```python
def calculate_discount(price: float, discount_rate: float, customer_tier: str) -> float:
    """
    Calculate final price after applying discount based on customer tier.
    
    Args:
        price: Original price of the item
        discount_rate: Base discount rate as decimal (0.1 for 10%)
        customer_tier: Customer tier ('bronze', 'silver', 'gold', 'platinum')
    
    Returns:
        Final price after discount
    
    Raises:
        ValueError: If price is negative or discount_rate is invalid
    
    Example:
        >>> calculate_discount(100.0, 0.1, 'gold')
        85.0
    """
    # Implementation
```

### README Files
- Every project and major module should have a README
- Include:
  - Project description and purpose
  - Prerequisites and dependencies
  - Installation instructions
  - Configuration guide
  - Usage examples
  - API documentation (or link to it)
  - Contributing guidelines
  - License information

### API Documentation
- Use OpenAPI/Swagger for REST APIs
- Document all endpoints, parameters, responses
- Provide example requests and responses
- Keep documentation in sync with code

### Architecture Documentation
- Use ADRs (Architecture Decision Records) for significant decisions
- Document system architecture with diagrams (C4 model)
- Maintain up-to-date deployment documentation

---

## 13. Code Review Expectations

### Before Submitting PR
- Self-review your code
- Run all tests locally
- Run linter and fix issues
- Update documentation
- Write clear commit messages (Conventional Commits format)
- Keep PRs small and focused (< 400 lines changed)

### PR Description
- Describe what and why, not how
- Link related issues/tickets
- Include screenshots for UI changes
- List breaking changes
- Mention areas needing special attention

### Review Checklist
- [ ] Code follows style guidelines
- [ ] Changes are well-tested
- [ ] No security vulnerabilities introduced
- [ ] Performance impact considered
- [ ] Documentation updated
- [ ] No hardcoded values or secrets
- [ ] Error handling implemented
- [ ] Logging added appropriately
- [ ] Accessibility requirements met
- [ ] SEO requirements met (for frontend)
- [ ] No console.log or debug code left
- [ ] Build passes without warnings

### Reviewer Responsibilities
- Review within 24 hours
- Focus on logic, not style (use automated linting)
- Ask questions, don't demand changes
- Approve when satisfied or request changes with clear feedback
- Check for:
  - Security issues
  - Performance problems
  - Potential bugs
  - Code maintainability
  - Test coverage

---

## 14. What Copilot Should NOT Do

### Never Generate
- ❌ Code with hardcoded credentials, API keys, or secrets
- ❌ Code with SQL injection vulnerabilities
- ❌ Code with XSS vulnerabilities
- ❌ Code that exposes sensitive error information to users
- ❌ Code without proper input validation
- ❌ Code that uses deprecated APIs without justification
- ❌ Non-inclusive or potentially offensive variable names or comments
- ❌ Code that violates copyright or licenses
- ❌ Code using `eval()` or similar dangerous functions without explicit justification
- ❌ Code that accesses admin/root accounts without proper authorization checks

### Never Use
- ❌ `var` in JavaScript (use `const` or `let`)
- ❌ `==` or `!=` in JavaScript (use `===` or `!==`)
- ❌ Synchronous blocking operations in Node.js
- ❌ Administrative ResourceResolver in AEM production code
- ❌ `console.log()` in production code (use proper logging framework)
- ❌ Magic numbers without named constants
- ❌ Generic exception catching without specific handling
- ❌ `any` type in TypeScript unless absolutely necessary
- ❌ Inline styles (use CSS classes)
- ❌ `document.write()`

### Never Skip
- ❌ Input validation on server side
- ❌ Error handling for async operations
- ❌ Closing resources (database connections, file handles, ResourceResolvers)
- ❌ Null/undefined checks when accessing potentially null values
- ❌ Alt text for images
- ❌ ARIA labels for custom interactive elements
- ❌ Type definitions in TypeScript
- ❌ Test cases for new functionality

### Never Ignore
- ❌ Security best practices
- ❌ Accessibility requirements
- ❌ SEO requirements
- ❌ Performance implications
- ❌ Existing code style and conventions
- ❌ Linter errors or warnings
- ❌ Test failures

---

## 15. Final Mandate for GitHub Copilot

**GitHub Copilot must always generate code that is:**

✅ **Production-Ready**: Code should be complete, tested, and ready to deploy without major modifications.

✅ **Secure**: Follow all security best practices. Never introduce vulnerabilities. Validate all inputs. Protect against XSS, SQL injection, CSRF, and other common attacks.

✅ **SEO-Optimized**: All web pages must include proper meta tags, semantic HTML, structured data, and follow SEO best practices outlined in this document.

✅ **Accessible**: Meet WCAG 2.1 Level AA standards. Support keyboard navigation, screen readers, and assistive technologies.

✅ **Performant**: Write efficient code. Consider performance implications. Implement lazy loading, caching, and optimization techniques.

✅ **Maintainable**: Write clean, readable, well-documented code that other developers can understand and modify easily.

✅ **Type-Safe**: Use TypeScript with strict mode. Use type hints in Python. Define interfaces and types properly.

✅ **Well-Tested**: Include appropriate unit tests. Consider edge cases and error conditions.

✅ **Standards-Compliant**: Follow all language-specific standards, naming conventions, and architectural patterns outlined in this document.

✅ **Error-Handled**: Implement proper error handling. Log errors appropriately. Never swallow exceptions silently.

✅ **Documented**: Include JSDoc/JavaDoc/docstrings for public APIs. Write clear comments for complex logic.

**Remember**: Quality over speed. It's better to take time to generate correct, secure, maintainable code than to quickly produce code that needs extensive revisions or introduces bugs and vulnerabilities.

---

**END OF INSTRUCTIONS**
