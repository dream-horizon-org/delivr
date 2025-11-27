import { Button, useMantineTheme } from "@mantine/core";

export function CTAButton(props: any) {
  const theme = useMantineTheme();
  const { styles, ...restProps } = props;

  const mergedStyles = typeof styles === 'function'
    ? styles
    : {
        root: {
          transition: theme.other.transitions.normal,
          "&:hover": {
            transform: "translateY(-2px)",
            boxShadow: theme.other.shadows.hover,
          },
          ...(styles && typeof styles === 'object' && 'root' in styles ? styles.root : {}),
        },
        ...(styles && typeof styles === 'object' ? styles : {}),
      };

  return (
    <Button
      variant="gradient"
      gradient={{ from: theme.other.brand.primary, to: theme.other.brand.secondary, deg: 135 }}
      styles={mergedStyles}
      {...restProps}
    />
  );
}

