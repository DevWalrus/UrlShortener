# Vite Frontend Standards

Standards and best practices for the Vite-based frontend application.

## Project Structure

```
src/
├── components/        # Reusable Vue components
├── pages/            # Page-level components (routes)
├── stores/           # State management (Pinia/Vuex)
├── utils/            # Utility functions
├── hooks/            # Custom composables
├── styles/           # Global styles, SCSS
├── assets/           # Images, fonts
└── App.vue           # Root component
```

## Component Organization

### File Naming
- Components: PascalCase (`Button.vue`, `UserCard.vue`)
- Pages: PascalCase (`HomePage.vue`, `UserProfile.vue`)
- Utilities: camelCase (`dateUtils.js`, `apiClient.js`)
- Composables: camelCase, prefix with `use` (`useUser.js`, `useForm.js`)

### Single File Component Structure

```vue
<template>
  <!-- Template first -->
  <div class="container">
    <h1>{{ title }}</h1>
    <button @click="handleClick">Click me</button>
  </div>
</template>

<script setup>
// Script second - use composition API + setup syntax
import { ref, computed } from 'vue'
import { useStore } from '@/stores'

const props = defineProps({
  title: String
})

const emit = defineEmits(['update'])

const state = ref(0)
const doubled = computed(() => state.value * 2)

const handleClick = () => {
  emit('update', state.value)
}
</script>

<style scoped>
/* Scoped styles last */
.container {
  padding: 1rem;
}
</style>
```

### Component Props

Always define props with types:

❌ **Bad**: No prop definition
```vue
<script setup>
// Props not declared - easy to miss required fields
const handleUser = (user) => {
  console.log(user.id)
}
</script>
```

✅ **Good**: Explicit prop definition
```vue
<script setup>
import { defineProps, defineEmits } from 'vue'

const props = defineProps({
  user: {
    type: Object,
    required: true,
    validator: (value) => value.id && value.email
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update', 'delete'])
</script>
```

## State Management

### When to Use Local State
- Component-only state
- Form input
- UI state (expanded, modal open, etc.)

```vue
<script setup>
import { ref } from 'vue'

const isOpen = ref(false)
const formData = ref({ name: '', email: '' })
</script>
```

### When to Use Global State (Pinia/Vuex)
- Shared across multiple components
- Persisted state
- API data
- Authentication

```javascript
// stores/user.js
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUserStore = defineStore('user', () => {
  const currentUser = ref(null)
  const loading = ref(false)

  const fetchUser = async (id) => {
    loading.value = true
    try {
      const response = await fetch(`/api/users/${id}`)
      currentUser.value = await response.json()
    } finally {
      loading.value = false
    }
  }

  return { currentUser, loading, fetchUser }
})
```

## Imports and Tree-Shaking

### Avoid Unused Imports

❌ **Bad**: Unused imports bloat bundle
```vue
<script setup>
import { ref, computed, onMounted, watch } from 'vue'  // Not all used
import utils from '@/utils'  // Not used
import _ from 'lodash'  // Entire library?

const count = ref(0)
</script>
```

✅ **Good**: Import only what you use
```vue
<script setup>
import { ref } from 'vue'

const count = ref(0)
</script>
```

### Use Specific Imports from Large Libraries

❌ **Bad**: Imports entire lodash library
```javascript
import _ from 'lodash'
const sorted = _.sortBy(items, 'name')
```

✅ **Good**: Import specific function
```javascript
import { sortBy } from 'lodash-es'
const sorted = sortBy(items, 'name')
```

## Lifecycle and Effects

### Composition API Only

Use `<script setup>` with Composition API (Vue 3+):

```vue
<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

const data = ref(null)
const isLoading = ref(true)

onMounted(async () => {
  data.value = await fetchData()
  isLoading.value = false
})

onUnmounted(() => {
  // Cleanup if needed
})

const displayData = computed(() => data.value?.formatted)
</script>
```

### No Direct DOM Manipulation

❌ **Bad**: Direct DOM access
```vue
<script setup>
const handleClick = () => {
  document.getElementById('myInput').value = 'text'
  document.querySelector('.container').style.display = 'none'
}
</script>
```

✅ **Good**: Vue bindings
```vue
<template>
  <input v-model="inputValue" />
  <div v-show="isVisible" class="container">...</div>
</template>

<script setup>
import { ref } from 'vue'

const inputValue = ref('')
const isVisible = ref(true)
</script>
```

## TypeScript (if used)

### Type Props and State

```vue
<script setup lang="ts">
import { ref, computed } from 'vue'

interface User {
  id: number
  name: string
  email: string
}

const props = defineProps<{
  user: User
  loading?: boolean
}>()

const count = ref<number>(0)
const items = ref<User[]>([])

const doubled = computed<number>(() => count.value * 2)
</script>
```

## API Integration

### Use Composables for API Calls

❌ **Bad**: API calls scattered in components
```vue
<script setup>
const fetchUser = async (id) => {
  const response = await fetch(`/api/users/${id}`)
  return await response.json()
}
</script>
```

✅ **Good**: Centralized API composable
```javascript
// hooks/useUser.js
import { ref } from 'vue'

export const useUser = () => {
  const user = ref(null)
  const error = ref(null)
  const loading = ref(false)

  const fetchUser = async (id) => {
    loading.value = true
    error.value = null
    try {
      const response = await fetch(`/api/users/${id}`)
      if (!response.ok) throw new Error('Failed to fetch')
      user.value = await response.json()
    } catch (err) {
      error.value = err.message
    } finally {
      loading.value = false
    }
  }

  return { user, error, loading, fetchUser }
}
```

Then use it:
```vue
<script setup>
import { useUser } from '@/hooks/useUser'

const { user, loading, error, fetchUser } = useUser()

const userId = '123'
await fetchUser(userId)
</script>
```

## Styling

### Use Scoped Styles

```vue
<style scoped>
/* Scoped to this component only */
.button {
  padding: 0.5rem 1rem;
}
</style>
```

### SCSS Variables and Mixins

```vue
<style scoped lang="scss">
@import '@/styles/variables.scss'

.card {
  background: $color-bg;
  padding: $spacing-md;
  border-radius: $border-radius;
}
</style>
```

### Avoid Inline Styles

❌ **Bad**: Inline styles
```vue
<div :style="{ color: color, fontSize: size + 'px' }">Text</div>
```

✅ **Good**: Class bindings
```vue
<template>
  <div :class="['card', { 'card-active': isActive }, themeClass]">
    Text
  </div>
</template>

<script setup>
import { computed } from 'vue'

const isActive = ref(true)
const themeClass = computed(() => `theme-${theme.value}`)
</script>
```

## Accessibility (a11y)

### Semantic HTML
```vue
<template>
  <!-- Good: Semantic elements -->
  <nav>
    <a href="#main">Skip to main</a>
  </nav>
  
  <main id="main">
    <article>
      <h1>Title</h1>
      <p>Content</p>
    </article>
  </main>

  <!-- Good: Form labels -->
  <form @submit.prevent="submit">
    <label for="email">Email:</label>
    <input id="email" v-model="email" type="email" required />
  </form>
</template>
```

### ARIA Attributes When Needed
```vue
<button 
  aria-label="Close dialog"
  aria-pressed="isActive"
  @click="close"
>
  ✕
</button>
```

## Build Optimization

### Lazy Load Components

```javascript
// Good: Lazy-load heavy components
import { defineAsyncComponent } from 'vue'

const HeavyComponent = defineAsyncComponent(() =>
  import('@/components/Heavy.vue')
)
```

### Dynamic Imports for Routes

```javascript
// router.js
const routes = [
  {
    path: '/',
    component: () => import('@/pages/Home.vue')
  },
  {
    path: '/user/:id',
    component: () => import('@/pages/User.vue')
  }
]
```

## Common Issues to Catch When Reviewing

1. **Unused imports** - Check that every import is used
2. **Missing props definition** - Props should always be declared
3. **Direct DOM access** - Should use Vue refs instead
4. **Console.log left in code** - Remove debug statements
5. **No error handling** - API calls need error states
6. **Mixed state patterns** - Use either local or global, not mixed
7. **Inline styles everywhere** - Use classes and SCSS
8. **No key on v-for** - Dynamic lists need :key
9. **Missing accessibility** - Forms need labels, buttons need context
10. **Component bloat** - Extract logic into composables if >300 lines

## Vite-Specific

### Env Variables

Use `import.meta.env` for environment variables:

```javascript
const API_URL = import.meta.env.VITE_API_URL
const isDev = import.meta.env.DEV

// In .env file:
VITE_API_URL=http://localhost:3000
```

### Dynamic Imports

```javascript
// Good: Code-split by route
const component = () => import(`./components/${name}.vue`)

// Avoid: Using require() - not treeshaken
const component = require(`./components/${name}.vue`)
```
