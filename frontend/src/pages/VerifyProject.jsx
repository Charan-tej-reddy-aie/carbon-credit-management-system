import { useEffect, useState } from "react";
import {
    useNavigate,
    useParams,
    useSearchParams
} from "react-router-dom";

import api from "../services/api";
import LoadingSpinner from "../components/LoadingSpinner";


function VerifyProject() {

    const { projectId } = useParams();

    const [searchParams] =
        useSearchParams();

    const navigate = useNavigate();


    /* =====================================================
       NOTIFICATION ID
       ===================================================== */

    const notificationId =
        searchParams.get("notification");


    /* =====================================================
       STATE
       ===================================================== */

    const [project, setProject] =
        useState(null);

    const [notification, setNotification] =
        useState(null);

    const [verifiedCo2, setVerifiedCo2] =
        useState("");

    const [creditsUsed, setCreditsUsed] =
        useState("");

    const [status, setStatus] =
        useState("APPROVED");

    const [remarks, setRemarks] =
        useState("");


    const [loading, setLoading] =
        useState(true);

    const [submitting, setSubmitting] =
        useState(false);

    const [error, setError] =
        useState("");

    const [message, setMessage] =
        useState("");


    /* =====================================================
       COMPLETION REVIEW CHECK
       ===================================================== */

    const isCompletionReview =
        notification?.notification_type ===
        "COMPLETION_REVIEW";


    /* =====================================================
       LOAD PROJECT + NOTIFICATION
       ===================================================== */

    useEffect(() => {

        const fetchData = async () => {

            try {

                setLoading(true);
                setError("");


                /* -----------------------------------------
                   PROJECT ID CHECK
                   ----------------------------------------- */

                if (!projectId) {

                    throw new Error(
                        "Project ID is required"
                    );
                }


                /* -----------------------------------------
                   NOTIFICATION ID CHECK
                   ----------------------------------------- */

                if (!notificationId) {

                    throw new Error(
                        "Verification notification is missing"
                    );
                }


                /* -----------------------------------------
                   GET PENDING NOTIFICATIONS
                   ----------------------------------------- */

                const response =
                    await api.get(
                        "/verifications/pending"
                    );


                const notifications =
                    response.data.data || [];


                /* -----------------------------------------
                   FIND CURRENT NOTIFICATION
                   ----------------------------------------- */

                const currentNotification =
                    notifications.find(
                        (item) =>
                            String(
                                item.notification_id
                            ) ===
                            String(
                                notificationId
                            ) &&
                            String(
                                item.project_id
                            ) ===
                            String(
                                projectId
                            )
                    );


                if (!currentNotification) {

                    throw new Error(
                        "Verification notification not found or it is no longer pending"
                    );
                }


                /* -----------------------------------------
                   STORE NOTIFICATION
                   ----------------------------------------- */

                setNotification(
                    currentNotification
                );


                /* -----------------------------------------
                   BUILD PROJECT OBJECT
                   ----------------------------------------- */

                const projectData = {

                    project_id:
                        currentNotification.project_id,

                    project_name:
                        currentNotification.project_name,

                    project_type:
                        currentNotification.project_type,

                    description:
                        currentNotification.description,

                    location:
                        currentNotification.location,

                    estimated_co2_reduction:
                        currentNotification.estimated_co2_reduction,

                    start_date:
                        currentNotification.start_date,

                    end_date:
                        currentNotification.end_date,

                    status:
                        currentNotification.status,

                    company_name:
                        currentNotification.company_name,

                    owner_name:
                        currentNotification.company_owner
                };


                setProject(
                    projectData
                );


                /* -----------------------------------------
                   DEFAULT VERIFIED CO2
                   ----------------------------------------- */

                setVerifiedCo2(
                    currentNotification
                        .estimated_co2_reduction
                );


            } catch (error) {

                console.error(
                    "Load verification project error:",
                    error
                );


                setError(
                    error.response?.data?.message ||
                    error.message ||
                    "Failed to load verification details"
                );

            } finally {

                setLoading(false);
            }
        };


        fetchData();

    }, [
        projectId,
        notificationId
    ]);


    /* =====================================================
       SUBMIT VERIFICATION
       ===================================================== */

    const handleSubmit = async (e) => {

        e.preventDefault();


        setError("");
        setMessage("");


        /* -----------------------------------------------
           NOTIFICATION CHECK
           ----------------------------------------------- */

        if (!notificationId) {

            setError(
                "Verification notification is missing."
            );

            return;
        }


        /* -----------------------------------------------
           PROJECT CHECK
           ----------------------------------------------- */

        if (!projectId) {

            setError(
                "Project ID is required."
            );

            return;
        }


        /* -----------------------------------------------
           VERIFIED CO2
           ----------------------------------------------- */

        const verifiedValue =
            Number(verifiedCo2);


        if (
            verifiedCo2 === "" ||
            !Number.isFinite(
                verifiedValue
            ) ||
            verifiedValue < 0
        ) {

            setError(
                "Enter a valid verified CO₂ reduction amount."
            );

            return;
        }


        /* -----------------------------------------------
           COMPLETION CREDIT VALIDATION
           ----------------------------------------------- */

        let usedCredits = null;


        if (isCompletionReview) {

            usedCredits =
                Number(creditsUsed);


            if (
                creditsUsed === "" ||
                !Number.isFinite(
                    usedCredits
                ) ||
                usedCredits < 0
            ) {

                setError(
                    "Enter a valid number of credits used."
                );

                return;
            }


            if (
                usedCredits >
                verifiedValue
            ) {

                setError(
                    "Credits used cannot exceed verified CO₂ reduction."
                );

                return;
            }
        }


        /* -----------------------------------------------
           REMARKS VALIDATION
           ----------------------------------------------- */

        if (!remarks.trim()) {

            setError(
                "Please enter verification remarks."
            );

            return;
        }


        /* -----------------------------------------------
           CONFIRMATION
           ----------------------------------------------- */

        const decisionText =
            status === "APPROVED"
                ? "approve"
                : "reject";


        const confirmed =
            window.confirm(
                `Are you sure you want to ${decisionText} this project?`
            );


        if (!confirmed) {
            return;
        }


        /* -----------------------------------------------
           SUBMIT
           ----------------------------------------------- */

        setSubmitting(true);


        try {

            const response =
                await api.post(
                    "/verifications",
                    {
                        project_id:
                            Number(
                                projectId
                            ),

                        notification_id:
                            Number(
                                notificationId
                            ),

                        verified_co2_reduction:
                            verifiedValue,

                        credits_used:
                            isCompletionReview
                                ? usedCredits
                                : null,

                        status,

                        remarks:
                            remarks.trim()
                    }
                );


            setMessage(
                response.data.message ||
                "Verification completed successfully."
            );


            /* -----------------------------------------
               RETURN TO QUEUE
               ----------------------------------------- */

            setTimeout(() => {

                navigate(
                    "/verifications"
                );

            }, 1200);


        } catch (error) {

            console.error(
                "Submit verification error:",
                error
            );


            setError(
                error.response?.data?.message ||
                error.message ||
                "Failed to submit verification"
            );

        } finally {

            setSubmitting(false);
        }
    };


    /* =====================================================
       LOADING
       ===================================================== */

    if (loading) {

        return (
            <LoadingSpinner
                message="Loading verification details..."
            />
        );
    }


    /* =====================================================
       PROJECT NOT FOUND
       ===================================================== */

    if (!project) {

        return (
            <div className="page-container">

                <div className="error-message">
                    {error ||
                        "Project not found"}
                </div>


                <button
                    className="secondary-button"
                    onClick={() =>
                        navigate(
                            "/verifications"
                        )
                    }
                >
                    Back to Verification Queue
                </button>

            </div>
        );
    }


    /* =====================================================
       PAGE
       ===================================================== */

    return (

        <div className="verification-page">


            {/* =================================================
               HEADER
               ================================================= */}

            <div className="page-header">

                <div>

                    <p className="eyebrow">
                        PROJECT VERIFICATION
                    </p>


                    <h1>
                        {isCompletionReview
                            ? "Completion Review"
                            : "Initial Project Approval"}
                    </h1>


                    <p>
                        {isCompletionReview
                            ? "Review the completed project and record the credits used."
                            : "Review the project information before approving the project to begin."}
                    </p>

                </div>


                <button
                    className="secondary-button"
                    onClick={() =>
                        navigate(
                            "/verifications"
                        )
                    }
                >
                    ← Back to Queue
                </button>

            </div>


            {/* =================================================
               ERROR
               ================================================= */}

            {error && (

                <div className="error-message">
                    {error}
                </div>

            )}


            {/* =================================================
               SUCCESS
               ================================================= */}

            {message && (

                <div className="success-message">
                    {message}
                </div>

            )}


            {/* =================================================
               MAIN LAYOUT
               ================================================= */}

            <div className="verification-layout">


                {/* =================================================
                   PROJECT DETAILS
                   ================================================= */}

                <div className="project-details-card">

                    <div className="card-header">

                        <div>

                            <p className="eyebrow">
                                PROJECT DETAILS
                            </p>


                            <h2>
                                {project.project_name}
                            </h2>

                        </div>


                        <span className="status-badge submitted">
                            {project.status}
                        </span>

                    </div>


                    <div className="details-grid">


                        <div className="detail-item">

                            <span>
                                Project ID
                            </span>

                            <strong>
                                #{project.project_id}
                            </strong>

                        </div>


                        <div className="detail-item">

                            <span>
                                Project Type
                            </span>

                            <strong>
                                {project.project_type}
                            </strong>

                        </div>


                        <div className="detail-item">

                            <span>
                                Company
                            </span>

                            <strong>
                                {project.company_name ||
                                    "—"}
                            </strong>

                        </div>


                        <div className="detail-item">

                            <span>
                                Company Owner
                            </span>

                            <strong>
                                {project.owner_name ||
                                    "—"}
                            </strong>

                        </div>


                        <div className="detail-item">

                            <span>
                                Location
                            </span>

                            <strong>
                                {project.location}
                            </strong>

                        </div>


                        <div className="detail-item">

                            <span>
                                Estimated CO₂ Reduction
                            </span>

                            <strong>
                                {
                                    project.estimated_co2_reduction
                                }
                            </strong>

                        </div>


                        <div className="detail-item">

                            <span>
                                Start Date
                            </span>

                            <strong>
                                {
                                    project.start_date
                                }
                            </strong>

                        </div>


                        <div className="detail-item">

                            <span>
                                End Date
                            </span>

                            <strong>
                                {
                                    project.end_date
                                }
                            </strong>

                        </div>

                    </div>


                    {/* =================================================
                       DESCRIPTION
                       ================================================= */}

                    <div className="description-section">

                        <span>
                            Project Description
                        </span>

                        <p>
                            {project.description ||
                                "No description provided."}
                        </p>

                    </div>

                </div>


                {/* =================================================
                   VERIFICATION FORM
                   ================================================= */}

                <div className="verification-form-card">

                    <div className="card-header">

                        <div>

                            <p className="eyebrow">
                                VERIFICATION
                            </p>

                            <h2>
                                Verification Decision
                            </h2>

                        </div>

                    </div>


                    <form
                        onSubmit={handleSubmit}
                    >


                        {/* =============================================
                           VERIFIED CO2
                           ============================================= */}

                        <div className="form-group">

                            <label>
                                Verified CO₂ Reduction
                            </label>

                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={verifiedCo2}
                                onChange={(e) =>
                                    setVerifiedCo2(
                                        e.target.value
                                    )
                                }
                                placeholder="Enter verified CO₂ reduction"
                                required
                            />

                        </div>


                        {/* =============================================
                           CREDITS USED
                           ============================================= */}

                        {isCompletionReview && (

                            <div className="form-group">

                                <label>
                                    Credits Used
                                </label>

                                <input
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={creditsUsed}
                                    onChange={(e) =>
                                        setCreditsUsed(
                                            e.target.value
                                        )
                                    }
                                    placeholder="Enter credits used"
                                    required
                                />

                                <small>
                                    Credits used cannot exceed
                                    the verified CO₂ reduction.
                                </small>

                            </div>

                        )}


                        {/* =============================================
                           STATUS
                           ============================================= */}

                        <div className="form-group">

                            <label>
                                Decision
                            </label>

                            <select
                                value={status}
                                onChange={(e) =>
                                    setStatus(
                                        e.target.value
                                    )
                                }
                            >

                                <option value="APPROVED">
                                    Approve
                                </option>

                                <option value="REJECTED">
                                    Reject
                                </option>

                            </select>

                        </div>


                        {/* =============================================
                           REMARKS
                           ============================================= */}

                        <div className="form-group">

                            <label>
                                Verification Remarks
                            </label>

                            <textarea
                                value={remarks}
                                onChange={(e) =>
                                    setRemarks(
                                        e.target.value
                                    )
                                }
                                placeholder="Enter your verification remarks..."
                                rows="5"
                                required
                            />

                        </div>


                        {/* =============================================
                           SUBMIT
                           ============================================= */}

                        <button
                            type="submit"
                            className="primary-button"
                            disabled={submitting}
                        >

                            {submitting
                                ? "Submitting..."
                                : isCompletionReview
                                    ? "Submit Completion Verification"
                                    : "Submit Verification"}

                        </button>

                    </form>

                </div>

            </div>

        </div>
    );
}


export default VerifyProject;