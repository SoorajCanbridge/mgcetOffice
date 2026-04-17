/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
    './contexts/**/*.{js,jsx}',
  ],
  darkMode: 'class',
  theme: {
  	extend: {
  		colors: {
  			'bg-primary': 'var(--bg-primary)',
  			'bg-secondary': 'var(--bg-secondary)',
  			'bg-tertiary': 'var(--bg-tertiary)',
  			'text-primary': 'var(--text-primary)',
  			'text-secondary': 'var(--text-secondary)',
  			'text-tertiary': 'var(--text-tertiary)',
  			'border-color': 'var(--border-color)',
  			'border-color-hover': 'var(--border-color-hover)',
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))',
  				active: 'hsl(var(--primary-active, var(--primary)))',
  				soft: 'hsl(var(--primary-soft, var(--primary)))'
  			},
  			'primary-hover': 'var(--primary-hover)',
  			'primary-light': 'var(--primary-light)',
  			success: 'var(--success)',
  			error: 'var(--error)',
  			warning: 'var(--warning)',
  			info: 'var(--info)',
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))',
  				active: 'hsl(var(--accent-active, var(--accent)))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			},
  			sidebar: {
  				DEFAULT: 'hsl(var(--sidebar-background))',
  				foreground: 'hsl(var(--sidebar-foreground))',
  				primary: 'hsl(var(--sidebar-primary))',
  				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
  				accent: 'hsl(var(--sidebar-accent))',
  				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
  				'active': 'hsl(var(--sidebar-active, var(--sidebar-accent)))',
  				'active-foreground': 'hsl(var(--sidebar-active-foreground, var(--sidebar-accent-foreground)))',
  				border: 'hsl(var(--sidebar-border))',
  				ring: 'hsl(var(--sidebar-ring))'
  			}
  		},
  		borderRadius: {
  			sm: 'calc(var(--radius) - 4px)',
  			md: 'calc(var(--radius) - 2px)',
  			lg: 'var(--radius)',
  			xl: 'var(--radius-xl)'
  		},
  		boxShadow: {
  			sm: 'var(--shadow-sm)',
  			md: 'var(--shadow-md)',
  			lg: 'var(--shadow-lg)',
  			xl: 'var(--shadow-xl)',
  			active: 'var(--shadow-active, 0 0 0 1px hsl(var(--ring) / 0.45), 0 8px 20px -12px hsl(var(--primary) / 0.55))',
  			inset: 'inset 0 1px 0 hsl(var(--foreground) / 0.06)'
  		},
  		transitionProperty: {
  			all: 'all',
  			colors: 'color, background-color, border-color, text-decoration-color, fill, stroke',
  			size: 'width, height, padding, margin',
  			shadow: 'box-shadow'
  		},
  		transitionDuration: {
  			default: '220ms',
  			fast: '140ms',
  			slow: '320ms'
  		},
  		transitionTimingFunction: {
  			default: 'cubic-bezier(0.4, 0, 0.2, 1)',
  			emphasized: 'cubic-bezier(0.2, 0.9, 0.2, 1)'
  		},
  		scale: {
  			'98': '.98',
  			'99': '.99',
  			'101': '1.01'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
}

