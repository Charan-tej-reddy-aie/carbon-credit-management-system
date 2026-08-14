function StatusBadge({ status }) {
    const normalizedStatus = status
        ?.toUpperCase()
        .replace(/_/g, " ");

    let className = "status-badge";

    if (
        status === "APPROVED" ||
        status === "CREDITS_ISSUED" ||
        status === "ACTIVE" ||
        status === "SUCCESSFUL"
    ) {
        className += " status-success";
    } else if (
        status === "SUBMITTED" ||
        status === "PENDING" ||
        status === "PARTIALLY_SOLD"
    ) {
        className += " status-pending";
    } else if (
        status === "REJECTED" ||
        status === "FAILED"
    ) {
        className += " status-danger";
    } else {
        className += " status-neutral";
    }

    return (
        <span className={className}>
            {normalizedStatus || "UNKNOWN"}
        </span>
    );
}

export default StatusBadge;