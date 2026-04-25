#!/usr/bin/env python3
import re
import sys
import glob

def fix_gradient_dark_mode(content):
    """Add dark mode to gradient backgrounds"""

    # Pattern to match gradients without dark mode
    # bg-gradient-to-[direction] from-[color] to-[color]
    pattern = r'(bg-gradient-to-[a-z]+\s+from-[a-z]+-\d+(?:\s+via-[a-z]+-\d+)?\s+to-[a-z]+-\d+)(?!\s+dark:)'

    def add_dark_gradient(match):
        original = match.group(1)
        # Add dark mode equivalents
        # For light gradients, use gray-900/gray-800 in dark mode
        if 'from-gray-50' in original or 'from-white' in original or 'from-pink-50' in original or 'from-blue-50' in original or 'from-purple-50' in original:
            return original + ' dark:from-gray-900 dark:via-gray-900 dark:to-gray-800'
        else:
            # For colored gradients, keep them but darken slightly
            return original

    return re.sub(pattern, add_dark_gradient, content)

# Process all TypeScript files
for pattern in ['src/pages/*.tsx', 'src/components/**/*.tsx']:
    for filepath in glob.glob(pattern, recursive=True):
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()

            new_content = fix_gradient_dark_mode(content)

            if new_content != content:
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                print(f"✓ Fixed gradients in {filepath}")
        except Exception as e:
            print(f"✗ Error processing {filepath}: {e}")

print("\n✅ Gradient dark mode fixes complete!")
