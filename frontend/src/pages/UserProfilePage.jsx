import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { apiRequest } from '../api/client'
import { useAuth } from '../auth/AuthContext'

export function UserProfilePage() {
  const { userId } = useParams()
  const navigate = useNavigate()
  const { logout } = useAuth()
  const ownerMode = Boolean(userId)
  const [profile, setProfile] = useState(null)
  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    contactEmail: '',
    address: '',
    profileImageDataUrl: null,
  })
  const [saving, setSaving] = useState(false)
  const [updatingAccess, setUpdatingAccess] = useState(false)
  const [deletingProfile, setDeletingProfile] = useState(false)
  const [removingPhoto, setRemovingPhoto] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    apiRequest(ownerMode ? `/profile/members/${userId}` : '/profile/me')
      .then((data) => {
        setProfile(data)
        setForm(data)
      })
      .catch((requestError) => setError(requestError.message))
  }, [ownerMode, userId])

  function selectPhoto(event) {
    const file = event.target.files?.[0]
    if (!file) return
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setError('Choose a PNG, JPEG, or WebP image.')
      return
    }
    if (file.size > 700 * 1024) {
      setError('The profile picture must be smaller than 700 KB.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setForm((current) => ({ ...current, profileImageDataUrl: reader.result }))
      setError('')
    }
    reader.readAsDataURL(file)
  }

  async function save(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const body = ownerMode
        ? { fullName: form.fullName, phone: form.phone, loginEmail: form.loginEmail }
        : {
            contactEmail: form.contactEmail,
            address: form.address,
            profileImageDataUrl: form.profileImageDataUrl,
            ...(profile.ownerEditingAllowed
              ? { fullName: form.fullName, phone: form.phone, loginEmail: form.loginEmail }
              : {}),
          }
      const updated = await apiRequest(ownerMode ? `/profile/members/${userId}` : '/profile/me', {
        method: 'PUT',
        body: JSON.stringify(body),
      })
      if (!ownerMode && profile.ownerEditingAllowed && updated.loginEmail !== profile.loginEmail) {
        logout()
        navigate('/login', {
          replace: true,
          state: {
            notice: `Login email changed to ${updated.loginEmail}. Sign in again with the new email.`,
          },
        })
        return
      }
      setProfile(updated)
      setForm(updated)
      setNotice(
        ownerMode
          ? 'Name and phone number updated by Owner.'
          : 'Your personal profile was updated.',
      )
      window.dispatchEvent(new Event('financial-platform-user-profile-updated'))
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSaving(false)
    }
  }

  async function removePhoto() {
    setRemovingPhoto(true)
    setError('')
    setNotice('')
    try {
      const updated = await apiRequest('/profile/me', {
        method: 'PUT',
        body: JSON.stringify({
          contactEmail: form.contactEmail,
          address: form.address,
          profileImageDataUrl: null,
        }),
      })
      setProfile(updated)
      setForm(updated)
      setNotice('Your profile picture was removed.')
      window.dispatchEvent(new Event('financial-platform-user-profile-updated'))
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setRemovingPhoto(false)
    }
  }

  async function changeAccess() {
    const nextActive = !profile.active
    setUpdatingAccess(true)
    setError('')
    setNotice('')
    try {
      const updated = await apiRequest(`/profile/members/${userId}/access`, {
        method: 'PATCH',
        body: JSON.stringify({ active: nextActive }),
      })
      setProfile(updated)
      setForm(updated)
      setNotice(
        nextActive
          ? 'Account access is active. This person can sign in again.'
          : 'Account access is inactive. This person can no longer sign in.',
      )
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setUpdatingAccess(false)
    }
  }

  async function deleteProfile() {
    if (
      !window.confirm(
        `Delete ${profile.fullName}'s profile? They will lose access and disappear from the directory. Financial audit records will be preserved.`,
      )
    )
      return
    setDeletingProfile(true)
    setError('')
    try {
      await apiRequest(`/profile/members/${userId}`, { method: 'DELETE' })
      navigate('/operations', {
        replace: true,
        state: { notice: `${profile.fullName}'s profile was deleted.` },
      })
    } catch (requestError) {
      setError(requestError.message)
      setDeletingProfile(false)
    }
  }

  if (!profile && !error) return <p>Loading profile…</p>
  const canEditOfficial = ownerMode || profile?.ownerEditingAllowed
  return (
    <div className="page-stack user-profile-page">
      <div>
        <p className="eyebrow">Personal account</p>
        <h1>{ownerMode ? 'Manage team profile' : 'My profile'}</h1>
        <p>
          {ownerMode
            ? 'Owners control the team member’s official name and phone number.'
            : profile?.ownerEditingAllowed
              ? 'Manage your account identity, contact information, and profile picture.'
              : 'Manage your profile picture, address, and contact email.'}
        </p>
      </div>
      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="success-message" role="status">
          {notice}
        </p>
      )}
      {profile && (
        <>
          <form className="panel user-profile-form" onSubmit={save}>
            <aside className="profile-photo-editor">
              <div>
                {form.profileImageDataUrl ? (
                  <img src={form.profileImageDataUrl} alt="Profile" />
                ) : (
                  <span>{profile.fullName?.slice(0, 1).toUpperCase()}</span>
                )}
              </div>
              {!ownerMode && (
                <>
                  <label className="button-like">
                    Choose photo
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={selectPhoto}
                    />
                  </label>
                  {form.profileImageDataUrl && (
                    <button
                      type="button"
                      className="secondary"
                      disabled={removingPhoto}
                      onClick={removePhoto}
                    >
                      {removingPhoto ? 'Removing…' : 'Remove photo'}
                    </button>
                  )}
                  <small>PNG, JPEG, or WebP; maximum 700 KB.</small>
                </>
              )}
            </aside>
            <section className="profile-fields">
              <label>
                Full name
                <input
                  required={canEditOfficial}
                  value={form.fullName || ''}
                  readOnly={!canEditOfficial}
                  onChange={(event) => setForm({ ...form, fullName: event.target.value })}
                />
                <small>
                  {canEditOfficial
                    ? 'You can update this official name.'
                    : 'Only the Owner can change this field.'}
                </small>
              </label>
              <label>
                Phone number
                <input
                  value={form.phone || ''}
                  readOnly={!canEditOfficial}
                  placeholder={canEditOfficial ? 'Enter phone number' : 'Not added by Owner'}
                  onChange={(event) => setForm({ ...form, phone: event.target.value })}
                />
                <small>
                  {canEditOfficial ? 'Editable by Owner' : 'Only the Owner can change this field.'}
                </small>
              </label>
              <label>
                Personal email
                <input
                  type="email"
                  value={form.contactEmail || ''}
                  readOnly={ownerMode}
                  onChange={(event) => setForm({ ...form, contactEmail: event.target.value })}
                />
                <small>
                  {ownerMode
                    ? 'Provided by the user; visible to Owners and Investors.'
                    : 'Your personal contact email. It does not change your login.'}
                </small>
              </label>
              <label className="profile-full-field">
                Address
                <textarea
                  rows="4"
                  maxLength="500"
                  value={form.address || ''}
                  readOnly={ownerMode}
                  onChange={(event) => setForm({ ...form, address: event.target.value })}
                />
              </label>
              <label>
                Role
                <input value={profile.role} readOnly />
              </label>
              <label>
                Account login email
                <input
                  required={canEditOfficial}
                  type="email"
                  value={form.loginEmail || ''}
                  readOnly={!canEditOfficial}
                  onChange={(event) => setForm({ ...form, loginEmail: event.target.value })}
                />
                <small>
                  {canEditOfficial
                    ? 'Changing this changes the email used for your next login.'
                    : 'Assigned by the Owner and used only to sign in.'}
                </small>
              </label>
              <button className="profile-full-field" type="submit" disabled={saving}>
                {saving ? 'Saving…' : ownerMode ? 'Save official details' : 'Save profile changes'}
              </button>
            </section>
          </form>
          {ownerMode && profile.role !== 'OWNER' && (
            <section className="panel profile-access-controls">
              <div>
                <p className="eyebrow">Account access</p>
                <h2>Manage access</h2>
                <p>
                  {profile.active
                    ? 'Active — this person can currently sign in.'
                    : 'Inactive — this person cannot sign in.'}
                </p>
              </div>
              <label className="investment-visibility-switch profile-access-switch">
                <span>{updatingAccess ? 'Updating…' : profile.active ? 'Active' : 'Inactive'}</span>
                <input
                  type="checkbox"
                  checked={profile.active}
                  disabled={updatingAccess || deletingProfile}
                  onChange={changeAccess}
                  aria-label={`${profile.active ? 'Deactivate' : 'Activate'} ${profile.fullName}'s access`}
                />
                <i aria-hidden="true" />
              </label>
              <div className="profile-delete-control">
                <strong>Delete profile</strong>
                <p>Removes this account from the directory and permanently blocks sign-in.</p>
                <button
                  type="button"
                  className="danger"
                  disabled={deletingProfile || updatingAccess}
                  onClick={deleteProfile}
                >
                  {deletingProfile ? 'Deleting…' : 'Delete profile'}
                </button>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}
