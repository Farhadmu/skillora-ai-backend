import { IsEmail, IsNotEmpty, IsString, MinLength, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../../../common/enums/roles.enum';

export class RegisterDto {
  @ApiProperty({ example: 'learner@skillora.ai' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'Password123!' })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password: string;

  @ApiProperty({ example: 'Farhadul Islam' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ enum: Role, default: Role.LEARNER, description: 'Role must be LEARNER, EDUCATOR, or EMPLOYER' })
  @IsEnum(Role)
  @IsOptional()
  role?: Role;

  @ApiProperty({ example: 'Aspiring AI Systems & Full-Stack Architect', required: false })
  @IsString()
  @IsOptional()
  headline?: string;

  // Learner fields
  @ApiProperty({ example: 'Bangladesh', required: false })
  @IsString()
  @IsOptional()
  country?: string;

  @ApiProperty({ example: 'Bachelor of Science', required: false })
  @IsString()
  @IsOptional()
  educationLevel?: string;

  @ApiProperty({ example: 'AI Systems Engineering', required: false })
  @IsString()
  @IsOptional()
  careerInterest?: string;

  // Educator fields
  @ApiProperty({ example: 'State University of Technology', required: false })
  @IsString()
  @IsOptional()
  institution?: string;

  @ApiProperty({ example: 'Distributed Systems & Cloud Computing', required: false })
  @IsString()
  @IsOptional()
  teachingArea?: string;

  @ApiProperty({ example: 8, required: false })
  @IsOptional()
  experienceYears?: number | string;

  // Employer fields
  @ApiProperty({ example: 'TechScale AI', required: false })
  @IsString()
  @IsOptional()
  companyName?: string;

  @ApiProperty({ example: '250-500', required: false })
  @IsString()
  @IsOptional()
  companySize?: string;

  @ApiProperty({ example: 'Generative AI & Enterprise SaaS', required: false })
  @IsString()
  @IsOptional()
  industry?: string;

  @ApiProperty({ example: 'Head of Talent Acquisition', required: false })
  @IsString()
  @IsOptional()
  jobTitle?: string;
}

export class LoginDto {
  @ApiProperty({ example: 'learner@skillora.ai' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'Password123!' })
  @IsString()
  @IsNotEmpty()
  password: string;
}

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

export class VerifyEmailDto {
  @ApiProperty({ description: 'Verification token sent via email' })
  @IsString()
  @IsNotEmpty()
  token: string;
}

export class ResendVerificationDto {
  @ApiProperty({ example: 'learner@skillora.ai' })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ example: 'learner@skillora.ai' })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty({ description: 'Password reset token received' })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({ example: 'NewPassword123!' })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  newPassword: string;
}

export class ChangePasswordDto {
  @ApiProperty({ example: 'OldPassword123!' })
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @ApiProperty({ example: 'NewPassword123!' })
  @IsString()
  @MinLength(8, { message: 'New password must be at least 8 characters long' })
  newPassword: string;
}
