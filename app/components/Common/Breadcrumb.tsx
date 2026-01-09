/**
 * Breadcrumb Component
 * Reusable breadcrumb component for consistent navigation across the app
 * 
 * Usage:
 * <Breadcrumb
 *   items={[
 *     { title: 'Home', href: '/dashboard/org' },
 *     { title: 'Releases', href: '/dashboard/org/releases' },
 *     { title: 'Current Page' }, // No href = current page (non-clickable)
 *   ]}
 *   mb={16} // Optional margin bottom
 * />
 */

import { Breadcrumbs, Text, Anchor, useMantineTheme } from '@mantine/core';
import { Link } from '@remix-run/react';

export interface BreadcrumbItem {
  title: string;
  href?: string; // If not provided or '#', item is non-clickable (current page)
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  mb?: number | string; // Margin bottom (default: 16)
}

export function Breadcrumb({ items, mb = 16 }: BreadcrumbProps) {
  const theme = useMantineTheme();
  // Returning null for now , will take a call later based on UI.
  return null;
//   const breadcrumbElements = items.map((item, index) => {
//     // If no href or href is '#', render as non-clickable text (current page)
//     if (!item.href || item.href === '#') {
//       return (
//         <Text key={index} size="sm" c={theme.colors.slate[6]}>
//           {item.title}
//         </Text>
//       );
//     }
//     return null

//     // Otherwise, render as clickable link
//     return (
//       <Anchor
//         key={index}
//         component={Link}
//         to={item.href}
//         size="sm"
//         c={theme.colors.slate[5]}
//       >
//         {item.title}
//       </Anchor>
//     );
//   });

//   return <Breadcrumbs mb={mb}>{breadcrumbElements}</Breadcrumbs>;
}

