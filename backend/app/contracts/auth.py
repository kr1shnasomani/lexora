from pydantic import BaseModel, UUID4

class SessionRequest(BaseModel):
    access_token: str

class UserInfo(BaseModel):
    user_id: UUID4 | str
    email: str
    role: str
    display_name: str
