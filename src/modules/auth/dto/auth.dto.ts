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
  @MinLength(6)
  password: string;

  @ApiProperty({ example: 'Farhadul Islam' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ enum: Role, default: Role.LEARNER })
  @IsEnum(Role)
  @IsOptional()
  role?: Role;

  @ApiProperty({ example: 'Aspiring AI Systems & Full-Stack Architect', required: false })
  @IsString()
  @IsOptional()
  headline?: string;
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
