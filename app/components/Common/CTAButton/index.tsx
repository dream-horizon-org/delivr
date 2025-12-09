import { Button, ButtonProps } from "@mantine/core";

interface CTAButtonProps extends ButtonProps {
  onClick?: () => void;
  // If variant is not provided, defaults to "filled" (Primary)
}

export function CTAButton({ style, ...props }: CTAButtonProps) {
  return (
    <Button
      {...props}
      style={{
        // Let Mantine theme handle most things, just ensure transitions
        transition: 'all 0.15s ease',
        ...style,
      }}
      styles={(theme) => ({
        root: {
          // Subtle lift on hover for that "polished" feel
          '&:hover': {
            transform: 'translateY(-1px)',
            boxShadow: props.variant === 'filled' || !props.variant 
              ? theme.shadows.md 
              : undefined,
          },
          '&:active': {
            transform: 'translateY(0)',
          },
        },
        ...(typeof props.styles === 'object' ? props.styles : {}),
      })}
    />
  );
}
