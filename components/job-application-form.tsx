"use client"
import { useState } from "react"

export default function JobApplicationForm({ jobId, jobTitle }: { jobId: string; jobTitle: string }) {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [industry, setIndustry] = useState("")
  const [logisticsBackground, setLogisticsBackground] = useState(false)
  const [openToShift, setOpenToShift] = useState(false)
  const [openForJob, setOpenForJob] = useState(true)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!file) {
      setErrorMsg("Please upload your resume.")
      return
    }
    setLoading(true)
    setErrorMsg(null)
    const formData = new FormData(e.currentTarget)
    formData.append("jobId", jobId)
    formData.set("name", name)
    formData.set("email", email)
    formData.set("phone", phone)
    formData.set("industry", industry)
    formData.set("logisticsBackground", String(logisticsBackground))
    formData.set("openToShift", String(openToShift))
    formData.set("openForJob", String(openForJob))
    try {
      const res = await fetch("/api/public/apply", { method: "POST", body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to submit application")
      setSuccess(true)
    } catch (err: any) {
      setErrorMsg(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleParseAutofill = async (f: File) => {
    try {
      const fd = new FormData()
      fd.append("resume", f)
      fd.append("jobId", jobId)
      fd.append("dryRun", "true")
      const res = await fetch("/api/public/apply", { method: "POST", body: fd })
      if (!res.ok) return
      const data = await res.json()
      const parsed = data.parsed || {}
      if (parsed.name) setName(parsed.name)
      if (parsed.email) setEmail(parsed.email)
      if (parsed.phone) setPhone(parsed.phone)
    } catch {}
  }

  if (success) {
    return (
      <div className="text-center py-8 space-y-4">
        <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
          <span className="text-green-600 font-semibold">✓</span>
        </div>
        <h3 className="text-xl font-semibold text-gray-900">Application Sent!</h3>
        <p className="text-gray-600">
          Thank you for applying to the <strong>{jobTitle}</strong> position.
        </p>
        <button className="px-4 py-2 border rounded-lg" onClick={() => window.location.reload()}>
          Submit Another Application
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {errorMsg && <div className="text-sm text-red-600">{errorMsg}</div>}
      <div className="space-y-2">
        <label htmlFor="name" className="block text-sm font-medium">Full Name *</label>
        <input id="name" name="name" required placeholder="John Doe" className="w-full border rounded px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="space-y-2">
        <label htmlFor="email" className="block text-sm font-medium">Email Address *</label>
        <input id="email" name="email" type="email" required placeholder="john@example.com" className="w-full border rounded px-3 py-2" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="space-y-2">
        <label htmlFor="phone" className="block text-sm font-medium">Phone Number</label>
        <input id="phone" name="phone" type="tel" placeholder="+1 (555) 000-0000" className="w-full border rounded px-3 py-2" value={phone} onChange={(e) => setPhone(e.target.value)} />
      </div>
      <div className="space-y-2">
        <label htmlFor="resume" className="block text-sm font-medium">Resume / CV *</label>
        <input
          type="file"
          id="resume"
          name="resume"
          accept=".pdf,.doc,.docx,.txt"
          required
          onChange={(e) => {
            const f = e.target.files?.[0] || null
            setFile(f)
            if (f) handleParseAutofill(f)
          }}
          className="w-full"
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-2">
          <label className="block text-sm font-medium">Industry</label>
          <input
            id="industry"
            name="industry"
            placeholder="Logistics, Transportation, Warehousing"
            className="w-full border rounded px-3 py-2"
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium">Logistics Background</label>
          <select
            id="logisticsBackground"
            name="logisticsBackground"
            className="w-full border rounded px-3 py-2"
            value={logisticsBackground ? "true" : "false"}
            onChange={(e) => setLogisticsBackground(e.target.value === "true")}
          >
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium">Open To Shift</label>
          <select
            id="openToShift"
            name="openToShift"
            className="w-full border rounded px-3 py-2"
            value={openToShift ? "true" : "false"}
            onChange={(e) => setOpenToShift(e.target.value === "true")}
          >
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium">Open For Job</label>
          <select
            id="openForJob"
            name="openForJob"
            className="w-full border rounded px-3 py-2"
            value={openForJob ? "true" : "false"}
            onChange={(e) => setOpenForJob(e.target.value === "true")}
          >
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        </div>
      </div>
      <div className="space-y-2">
        <label htmlFor="coverLetter" className="block text-sm font-medium">Cover Letter (Optional)</label>
        <textarea id="coverLetter" name="coverLetter" placeholder="Tell us why you're a great fit..." className="w-full border rounded px-3 py-2 min-h-[100px]" />
      </div>
      <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded px-4 py-2" disabled={loading}>
        {loading ? "Submitting..." : "Submit Application"}
      </button>
      <p className="text-xs text-center text-gray-400 pt-2">By submitting, you agree to our privacy policy.</p>
    </form>
  )
}
