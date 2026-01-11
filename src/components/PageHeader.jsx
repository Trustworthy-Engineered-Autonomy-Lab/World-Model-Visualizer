
// src/visualizers/piwm/ui/PageHeader.jsx
import React from "react";

export function PageHeader({
  styles,
  title,
  subtitle,
  right,
  callout,
}) {
  return (
    <div style={styles.homeHero}>
      <div>
        <h1 style={styles.h1}>{title}</h1>
        {subtitle ? <p style={styles.lead}>{subtitle}</p> : null}
      </div>
      {right ? <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{right}</div> : null}
      {callout ? <div style={styles.callout}>{callout}</div> : null}
    </div>

  );
}
